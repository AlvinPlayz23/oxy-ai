import { MODELS } from "@/lib/models";
import { Chat } from "@/components/chat";

export default function Home() {
  return <Chat models={MODELS} />;
}
