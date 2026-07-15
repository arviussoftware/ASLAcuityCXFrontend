"use client";

export default function MobileNotSupported() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted text-gray-900 px-6">
      <div className="max-w-md text-center shadow-lg rounded-2xl bg-card p-8">
        <div className="text-5xl mb-4">📵</div>

        <h1 className="text-2xl font-bold mb-3">
          Mobile Not Supported
        </h1>

        <p className="text-muted-foreground mb-6">
          This application is optimized for desktop screens.
          Please use a device with a larger screen for the best experience.
        </p>

        <p className="text-sm font-medium opacity-70">
          Resize your window or switch to a desktop view.
        </p>
      </div>
    </div>
  );
}

