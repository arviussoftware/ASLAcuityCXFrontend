"use client";

import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import withAuth from "@/components/withAuth";
import { useRouter } from "next/navigation";
import { useRef, use } from "react";
import UpdateUserPageContent from "./UpdateUserPageContent";

const UpdateUserPage = ({ params }) => {
  const { id } = use(params);
  const router = useRouter();
  const submitRef = useRef(null);
  const discardRef = useRef(null);

  return (
    <div className="p-4">
      <div className="min-w-[640px] mx-auto grid max-w-[90rem] gap-4 px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 shadow-md"
            onClick={() => {
              router.push("/dashboard/users");
            }}
            style={{
              backgroundColor: "var(--brand-primary)",
              color: "#ffffff",
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <h1 className="text-lg font-semibold tracking-tight">Update User</h1>

          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => discardRef.current?.click()}
            >
              Discard
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => submitRef.current?.click()}
              style={{ backgroundColor: "var(--brand-primary)" }}
            >
              Save User
            </Button>
          </div>
        </div>

        <Card className="shadow-md mt-4">
          <CardContent className="p-6">
            <UpdateUserPageContent
              userId={id}
              onSuccess={() => router.push("/dashboard/users")}
              onCancel={() => router.push("/dashboard/users")}
              submitRef={submitRef}
              discardRef={discardRef}
              hideFooterButtons={true}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default withAuth(UpdateUserPage);
