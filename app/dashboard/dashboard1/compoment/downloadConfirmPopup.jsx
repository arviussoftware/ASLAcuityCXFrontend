import React from 'react';

const DownloadConfirmPopup = ({ isOpen, onConfirm, onCancel, downloadType, noData }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black bg-opacity-50 backdrop-blur-sm">
      <div
        className="bg-card rounded-lg shadow-lg w-full max-w-sm p-5 flex flex-col items-center space-y-4 transform transition-all duration-200"
        style={{ animation: "fadeInScale 0.2s ease forwards" }}
      >
        {/* Icon */}
        <div className={`flex items-center justify-center w-10 h-10 rounded-full ${noData ? "bg-muted" : "bg-blue-50"}`}>
          <svg
            className={`w-5 h-5 ${noData ? "text-muted-foreground" : "text-blue-500"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            {noData ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            )}
          </svg>
        </div>

        {/* Title */}
        <h4 className="text-lg font-semibold text-foreground">
          {noData ? "No Data Found" : "Confirm Download"}
        </h4>

        {/* Message */}
        {!noData && (
          <p className="text-sm text-muted-foreground text-center">
            Download this data as a{" "}
            <span className="font-medium text-blue-500">
              {downloadType === "csv" ? "CSV" : "Excel"}
            </span>{" "}
            file?
          </p>
        )}

        {/* Buttons */}
        <div className="flex space-x-3 w-full justify-center">
          {noData ? (
            <button
              onClick={onCancel}
              className="inline-flex items-center px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-150"
            >
              OK
            </button>
          ) : (
            <>
              <button
                onClick={onConfirm}
                className="inline-flex items-center px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-150"
              >
                Yes
              </button>
              <button
                onClick={onCancel}
                className="inline-flex items-center px-3 py-1.5 bg-muted text-muted-foreground rounded-md hover:bg-secondary transition-colors duration-150"
              >
                No
              </button>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInScale {
          0% {
            opacity: 0;
            transform: scale(0.98) translateY(5px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default DownloadConfirmPopup;

