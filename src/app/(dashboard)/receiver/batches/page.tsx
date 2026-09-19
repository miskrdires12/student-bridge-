import { redirect } from "next/navigation";

/**
 * Inbound batches are deprecated in favor of direct live synchronization 
 * into the Student Credential Directory. Redirecting directly to /students.
 */
export default function ReceiverBatchesPage() {
  redirect("/students");
}
