"use client"; // Ensure this runs as a client component
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const withAuth = (WrappedComponent) => {
  const AuthenticatedComponent = (props) => {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [hasToken, setHasToken] = useState(false);

    useEffect(() => {
      const token = sessionStorage.getItem("token");

      if (!token) {
        // Redirect to the login page if the user is not authenticated
        router.replace("/"); // Use replace instead of push to prevent history entry
      } else {
        setHasToken(true);
      }
      setMounted(true);
    }, [router]);

    // Prevent rendering during SSR and initial client-side hydration to avoid mismatches.
    if (!mounted) {
      return null;
    }

    // Prevent rendering the wrapped component on the client if there is no token.
    if (!hasToken) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };

  // Set a display name for easier debugging in React DevTools
  AuthenticatedComponent.displayName = `withAuth(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;

  return AuthenticatedComponent;
};

export default withAuth;
