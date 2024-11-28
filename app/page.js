// app/page.js

'use client';
import { useState, useEffect } from "react";
import {
  Input,
  Button,
  Textarea,
  Loading,
  Spacer,
  Divider,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@nextui-org/react";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "../utils/firebaseConfig";

export default function Home() {
  // State for the meeting details
  const [meetingHost, setMeetingHost] = useState("");
  const [meetingAgenda, setMeetingAgenda] = useState("");
  const [meetingOutcomes, setMeetingOutcomes] = useState("");
  const [meetingDate, setMeetingDate] = useState(null);

  const [transcriptionResult, setTranscriptionResult] = useState(null);
  const [geminiResult, setGeminiResult] = useState(null);

  // State for participants
  const [participants, setParticipants] = useState([{ name: "", email: "" }]);

  // State for uploaded files
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // State for transcription
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Handler to add a new participant
  const addParticipant = () => {
    setParticipants([...participants, { name: "", email: "" }]);
  };

  // Handler to remove a participant by index
  const removeParticipant = (index) => {
    const updatedParticipants = participants.filter((_, i) => i !== index);
    setParticipants(updatedParticipants);
  };

  // Handler to update participant details
  const handleParticipantChange = (index, field, value) => {
    const updatedParticipants = participants.map((participant, i) => {
      if (i === index) {
        return { ...participant, [field]: value };
      }
      return participant;
    });
    setParticipants(updatedParticipants);
  };

  // Handler for file upload
  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files);
    const validTypes = [
      "audio/mpeg",
      "audio/mp4",
      "audio/wav",
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
    ];
    const maxSize = 100 * 1024 * 1024; // 100MB

    const filteredFiles = files.filter((file) => {
      if (!validTypes.includes(file.type)) {
        setError(`Unsupported file type: ${file.type}`);
        return false;
      }
      if (file.size > maxSize) {
        setError(`File size exceeds limit: ${file.name}`);
        return false;
      }
      return true;
    });

    if (filteredFiles.length !== files.length) {
      // Some files were invalid
      return;
    }

    setError(""); // Reset error if any

    // Upload each file to Firebase Storage
    filteredFiles.forEach((file) => {
      const uniqueId = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `uploads/${uniqueId}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      // Initialize the file in uploadedFiles state
      const newFile = {
        id: uniqueId,
        name: file.name,
        url: null,
        progress: 0,
        uploading: true,
        error: null,
      };
      setUploadedFiles((prevFiles) => [...prevFiles, newFile]);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          // Update progress
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          // Update the file's progress in the uploadedFiles state
          setUploadedFiles((prevFiles) =>
            prevFiles.map((f) =>
              f.id === uniqueId ? { ...f, progress } : f
            )
          );
        },
        (error) => {
          console.error("Error uploading file:", error);
          setError("Failed to upload file.");

          // Update the file's error and uploading status
          setUploadedFiles((prevFiles) =>
            prevFiles.map((f) =>
              f.id === uniqueId
                ? { ...f, error: "Failed to upload file.", uploading: false }
                : f
            )
          );
        },
        () => {
          // Upload completed successfully, get the download URL
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            // Update the file's url and uploading status
            setUploadedFiles((prevFiles) =>
              prevFiles.map((f) =>
                f.id === uniqueId
                  ? { ...f, url: downloadURL, uploading: false }
                  : f
              )
            );
          });
        }
      );
    });
  };

  // Handler to remove a file by id
  const removeFile = async (id) => {
    const fileToRemove = uploadedFiles.find((file) => file.id === id);
    if (!fileToRemove) return;

    const fileRef = ref(storage, `uploads/${id}`);

    // Delete the file from Firebase Storage
    try {
      await deleteObject(fileRef);
    } catch (error) {
      console.error("Error deleting file:", error);
      setError("Failed to delete file.");
      return;
    }

    // Remove the file from the state
    const updatedFiles = uploadedFiles.filter((file) => file.id !== id);
    setUploadedFiles(updatedFiles);
  };

  // Handler for form submission
  const handleSubmit = async () => {
    setIsLoading(true);
    setError("");
    setTranscriptionResult(null);

    if (
      !meetingHost ||
      !meetingAgenda ||
      !meetingOutcomes ||
      participants.some(
        (participant) => !participant.name || !participant.email
      ) ||
      uploadedFiles.length === 0
    ) {
      setError(
        "Please fill in all fields and upload a file to generate notes."
      );
      setIsLoading(false);
      return;
    }

    if (uploadedFiles.some((file) => file.uploading || !file.url)) {
      setError("Please wait until all files are uploaded.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Use the first uploaded file for transcription
      const fileUrl = uploadedFiles[0].url;

      // Initiate transcription
      const initiateResponse = await fetch("/api/initiateTranscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ audioUrl: fileUrl }),
      });

      const initiateData = await initiateResponse.json();

      if (!initiateResponse.ok) {
        throw new Error(initiateData.error || "Failed to initiate transcription.");
      }

      const { transcriptionId } = initiateData;

      // Start polling for transcription status
      const pollInterval = 5000; // 5 seconds
      let polling = true;

      while (polling) {
        // Wait for the specified interval
        await new Promise((resolve) => setTimeout(resolve, pollInterval));

        // Check transcription status
        const statusResponse = await fetch("/api/checkTranscriptionStatus", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ transcriptionId }),
        });

        const statusData = await statusResponse.json();

        if (!statusResponse.ok) {
          throw new Error(statusData.error || "Failed to check transcription status.");
        }

        const { status, error: transcriptionError, data } = statusData;

        if (status === "completed") {
          setTranscriptionResult(data);
          polling = false;

          // Process transcription result as needed
          const transcript = data.utterances.map((utterance) => {
            return [`Speaker ${utterance.speaker}`, utterance.text];
          });

          // Send transcript to your Gemini API
          try {
            const newResponse = await fetch(
              "https://hikemeetingapp.vercel.app/api/analyze-meeting",
              {
                method: "POST",
                body: JSON.stringify({
                  transcript,
                }),
                headers: {
                  "Content-Type": "application/json",
                },
              }
            );
            const newData = await newResponse.json();
            console.log(newData);
            setGeminiResult(newData);
          } catch (err) {
            console.error(err);
            setError("An unexpected error occurred while analyzing the meeting.");
          }
        } else if (status === "error") {
          throw new Error(transcriptionError || "Transcription failed.");
        }
        // If status is 'queued' or 'processing', continue polling
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during transcription.");
    } finally {
      setIsLoading(false);
    }
  };

  const allFilesUploaded =
    uploadedFiles.length > 0 &&
    uploadedFiles.every((file) => !file.uploading && file.url);

  if (!isLoading && !geminiResult)
    return (
      <div className="flex justify-center items-center w-full min-h-screen p-4 bg-gray-100">
        <div className="w-full max-w-5xl h-[90vh] shadow-xl bg-[#eeecf9] flex rounded-3xl overflow-hidden">
          {/* Left Panel */}
          <div className="bg-[#18185b] p-10 flex flex-col h-full gap-8 flex-1 text-white rounded-l-3xl">
            <div className="font-bold text-2xl"># Meeting Notes</div>
            <div className="font-bold text-xl">
              Implement post-meeting experience with just a few clicks.
            </div>
            <div className="text-gray-200">
              Get summary and notes using AI. Upload your meeting audio in file input.
            </div>
          </div>

          {/* Right Panel */}
          <div className="flex-[3] h-full p-10 gap-6 flex flex-col rounded-r-3xl overflow-y-auto">
            <div className="text-4xl font-black">Generate Meeting Notes</div>

            <span className="text-xl font-semibold">Meeting Metadata</span>

            {/* Meeting Host */}
            <Input
              clearable
              bordered
              label="Meeting Host"
              placeholder="Enter host name"
              value={meetingHost}
              onChange={(e) => setMeetingHost(e.target.value)}
            />

            {/* Meeting Agenda */}
            <Textarea
              bordered
              label="Meeting Agenda"
              placeholder="Enter meeting agenda"
              value={meetingAgenda}
              onChange={(e) => setMeetingAgenda(e.target.value)}
            />

            {/* Meeting Outcomes */}
            <Textarea
              bordered
              label="Meeting Outcomes"
              placeholder="Enter expected outcomes"
              value={meetingOutcomes}
              onChange={(e) => setMeetingOutcomes(e.target.value)}
            />

            {/* Participants Section */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xl font-semibold">Participants</span>
                <Button
                  color="secondary"
                  variant="flat"
                  auto
                  onClick={addParticipant}
                >
                  Add Participant
                </Button>
              </div>

              {participants.map((participant, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-2 p-4 border rounded-xl bg-white shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:gap-4">
                    <Input
                      clearable
                      bordered
                      label="Name"
                      placeholder="Participant Name"
                      value={participant.name}
                      onChange={(e) =>
                        handleParticipantChange(index, "name", e.target.value)
                      }
                      className="flex-1"
                    />
                    <Input
                      clearable
                      bordered
                      label="Email"
                      placeholder="Participant Email"
                      value={participant.email}
                      onChange={(e) =>
                        handleParticipantChange(index, "email", e.target.value)
                      }
                      className="flex-1"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      color="default"
                      variant="flat"
                      light
                      onClick={() => removeParticipant(index)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* File Upload Section */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xl font-semibold">
                  Upload Meeting Files
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept="audio/*,video/*"
                  name="file"
                  multiple
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500
      file:mr-4 file:py-2 file:px-4
      file:rounded-md file:border-0
      file:text-sm file:font-semibold
      file:bg-blue-50 file:text-blue-700
      hover:file:bg-blue-100"
                />
                {uploadedFiles.length > 0 && (
                  <div className="mt-2">
                    <ul className="list-disc list-inside">
                      {uploadedFiles.map((file) => (
                        <li key={file.id} className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span>{file.name}</span>
                            <Button
                              size="xs"
                              color="error"
                              variant="light"
                              onClick={() => removeFile(file.id)}
                            >
                              Remove
                            </Button>
                          </div>
                          {file.uploading && (
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div
                                className="bg-blue-600 h-2.5 rounded-full"
                                style={{ width: `${file.progress}%` }}
                              ></div>
                            </div>
                          )}
                          {!file.uploading && file.url && (
                            <div className="text-green-600 text-sm">
                              Upload completed
                            </div>
                          )}
                          {file.error && (
                            <div className="text-red-600 text-sm">
                              {file.error}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Transcription Section */}
            <div className="flex flex-col gap-2 mt-4">
              {isLoading && (
                <div className="flex items-center">
                  <Loading type="points" color="primary" />
                  <Spacer x={0.5} />
                  <span>Transcribing...</span>
                </div>
              )}

              {error && <div className="text-red-500">{error}</div>}
            </div>

            {/* Submit Button */}
            <div className="mt-6">
              <Button
                color="primary"
                size="lg"
                fullWidth
                onClick={handleSubmit}
                disabled={isLoading || !allFilesUploaded}
              >
                {isLoading ? "Transcribing..." : "Generate Notes"}
              </Button>
            </div>
          </div>
          </div>
        </div>
        );

  else if (isLoading)
    return (
      <div className="flex w-[100vw] h-[100vh] justify-center items-center">
        <div className="loader"></div>
      </div>
    );

  else
    return (
      <div className="flex flex-col w-[100vw] gap-8 p-12 h-[100vh] bg-white">
        <h1>Meeting notes</h1>
        <div className="flex flex-col gap-4">
          <div>Host: {meetingHost}</div>
          <div>Agenda: {meetingAgenda}</div>
          <div>Outcomes: {meetingOutcomes}</div>
          <div>
            Participants:
            <Table>
              <TableHeader>
                <TableColumn>Name</TableColumn>
                <TableColumn>Email</TableColumn>
              </TableHeader>
              <TableBody>
                {participants.map((participant, index) => (
                  <TableRow key={index}>
                    <TableCell>{participant.name}</TableCell>
                    <TableCell>{participant.email}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <Divider />
        <h1>
          <b>Meeting Notes and Discussion</b>
        </h1>
        <div>
          <h2>
            <b>Meeting Outcomes</b>
          </h2>
          <ul style={{ listStyleType: "decimal", paddingLeft: "20px" }}>
            {geminiResult?.data?.summary?.meeting_outcomes?.map(
              (outcome, index) => (
                <li key={index}>{outcome}</li>
              )
            )}
          </ul>
        </div>
        <Divider />
        <div>
          <h2>
            <b>Discussion Steps</b>
          </h2>
          <ul style={{ listStyleType: "decimal", paddingLeft: "20px" }}>
            {geminiResult?.data?.summary?.discuss_steps?.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2>
            <b>Counter Points</b>
          </h2>
          {geminiResult?.data?.analysis?.counterpoints &&
          geminiResult.data.analysis.counterpoints.length > 0 ? (
            geminiResult.data.analysis.counterpoints.map((counterpoint, index) => (
              <div key={index}>{counterpoint}</div>
            ))
          ) : (
            <div>No data found</div>
          )}
        </div>

        <div>
          <h2>
            <b>Proposed Ideas</b>
          </h2>
          {geminiResult?.data?.analysis?.proposed_ideas &&
          geminiResult.data.analysis.proposed_ideas.length > 0 ? (
            geminiResult?.data?.analysis?.proposed_ideas.map((ideaObj, index) => (
              <div key={index} className="mb-4 p-4 border rounded-lg bg-gray-50">
                <h3 className="font-semibold">Idea:</h3>
                <p>{ideaObj.idea || "N/A"}</p>
                <h3 className="font-semibold mt-2">Rationale:</h3>
                <p>{ideaObj.rationale || "N/A"}</p>
              </div>
            ))
          ) : (
            <div>No data found</div>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableColumn>Actions and Insights</TableColumn>
            <TableColumn>ETA</TableColumn>
            <TableColumn>DCI</TableColumn>
            <TableColumn>Decision Pending</TableColumn>
            <TableColumn>Importance</TableColumn>
          </TableHeader>
          <TableBody>
            {geminiResult.data.actions.map((action, index) => (
              <TableRow key={index}>
                <TableCell>{action.description}</TableCell>
                <TableCell>{action.Deadline}</TableCell>
                <TableCell>
                  D : {action.DRI} <br />
                  C : {action.C[0]} <br />
                  I : {action.I[0]}
                </TableCell>
                <TableCell>Y</TableCell>
                <TableCell>{action.Importance}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
}