"use client";

import { Input, Select } from "./Platform13PageControl";

export default function IntegrationDestinationFields({
  frequencyValue,
  onFrequencyChange,
  frequencyOptions = [],
  frequencyLoading = false,
  showFrequency = false,

  fileFormatValue,
  onFileFormatChange,
  fileFormatOptions = [
    { label: "MP3", value: "MP3" },
    { label: "MP4", value: "MP4" },
    { label: "WAV", value: "WAV" },
  ],
  showFileFormat = false,

  destDirectoryValue,
  onDestDirectoryChange,
  showDestDirectory = false,

  folderStructureValue,
  onFolderStructureChange,
  folderStructureOptions = [
    { label: "YearMonth", value: "YearMonth" },
    { label: "MonthYear", value: "MonthYear" },
    { label: "Date", value: "Date" },
  ],
  showFolderStructure = true,

  folderPathValue,
  onFolderPathChange,
  folderPathPlaceholder = "C:\\Exports\\",
  showFolderPath = false,

  sendFileValue,
  onSendFileChange,
  showSendFile = false,

  sendFileChannelValue,
  onSendFileChannelChange,
  sendFileChannelOptions = [
    { label: "S3", value: "S3" },
    { label: "SFTP", value: "SFTP" },
    { label: "GCP", value: "GCP" },
    { label: "Azure", value: "AZURE" },
    { label: "Local Drive", value: "LOCAL" },
  ],
  showSendFileChannel = true,
  disableSendFileChannel = false,
} = {}) {
  return (
    <>
      {showFrequency ? (
        <Select
          label="Frequency"
          placeholder={frequencyLoading ? "Loading frequency..." : "Select frequency"}
          value={frequencyValue}
          onChange={onFrequencyChange}
          options={frequencyOptions}
          disabled={frequencyLoading || frequencyOptions.length === 0}
        />
      ) : null}

      {showFileFormat ? (
        <Select
          label="File Format"
          placeholder="Select file format"
          value={fileFormatValue}
          onChange={onFileFormatChange}
          options={fileFormatOptions}
        />
      ) : null}

      {showFolderStructure ? (
        <Select
          label="Folder Structure"
          placeholder="Select structure"
          value={folderStructureValue}
          onChange={onFolderStructureChange}
          options={folderStructureOptions}
        />
      ) : null}

      {/* {showDestDirectory ? (
        <Input
          label="Destination Directory"
          placeholder="e.g. C:\\Exports\\"
          value={destDirectoryValue}
          onChange={onDestDirectoryChange}
        />
      ) : null} */}

      {showFolderPath ? (
        <Input
          label="Folder Path"
          placeholder={folderPathPlaceholder}
          value={folderPathValue}
          onChange={onFolderPathChange}
        />
      ) : null}

      {showSendFile ? (
        <Select
          label="Send File"
          placeholder="Select"
          value={sendFileValue}
          onChange={onSendFileChange}
          options={[
            { label: "Yes", value: "YES" },
            { label: "No", value: "NO" },
          ]}
        />
      ) : null}

      {showSendFileChannel ? (
        <Select
          label="Send File Channel"
          placeholder="Select channel"
          value={sendFileChannelValue}
          onChange={onSendFileChannelChange}
          options={sendFileChannelOptions}
          disabled={disableSendFileChannel}
        />
      ) : null}
    </>
  );
}
