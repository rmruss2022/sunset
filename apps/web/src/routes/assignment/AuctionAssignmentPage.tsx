import { useNavigate } from "react-router";

import { Button } from "../../components/ui/button";
import { AssignmentSection } from "./AssignmentSection";
import { CodeBlock } from "./CodeBlock";
import { TableOfContents } from "./TableOfContents";

const tocItems = [
  { id: "overview", label: "Overview" },
  { id: "requirements", label: "Requirements" },
  { id: "setup", label: "Setup / Run / Test" },
];

export function AuctionAssignmentPage() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    // Keep this route stable; the main build surface can change.
    navigate("/?confetti=true");
  };

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">
            Auction House Challenge
          </h1>
          <p className="text-xl text-gray-600">Interview Exercise — 4 hours</p>
        </header>

        <TableOfContents items={tocItems} />

        <AssignmentSection id="overview" title="Overview">
          <p>
            Build an auction house — think eBay. Multiple auctions run at the
            same time, users can browse and bid, and everything stays consistent.
          </p>
        </AssignmentSection>

        <AssignmentSection id="requirements" title="Requirements">
          <ul className="list-disc space-y-1 pl-5">
            <li>Users can browse auctions and place bids.</li>
            <li>Each auction closes at a defined end time.</li>
            <li>Bids must be validated server-side.</li>
            <li>The system should behave correctly under concurrent use.</li>
            <li>Make it work like a real auction house would.</li>
            <li>Make it look good.</li>
          </ul>
        </AssignmentSection>

        <AssignmentSection id="setup" title="Setup / Run / Test">
          <p>
            This repo uses Yarn workspaces. The server is Express + tRPC. The
            database is Postgres via Prisma.
          </p>

          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            Prerequisites
          </h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>Node.js (v20+ recommended)</li>
            <li>PostgreSQL running locally (or via Docker)</li>
          </ul>

          <h3 className="mt-4 text-lg font-semibold text-gray-900">Install</h3>
          <CodeBlock>{`yarn install`}</CodeBlock>

          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            Configure env
          </h3>
          <p>
            Create{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
              apps/server/.env
            </code>{" "}
            with{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
              DATABASE_URL
            </code>
            .
          </p>
          <CodeBlock>{`# apps/server/.env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/auction_house?schema=public"`}</CodeBlock>

          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            Migrate + seed
          </h3>
          <CodeBlock>{`yarn workspace @interview/server prisma migrate dev
yarn workspace @interview/server prisma db seed`}</CodeBlock>

          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            Run the app
          </h3>
          <CodeBlock>{`yarn dev`}</CodeBlock>
          <p className="text-sm text-gray-600">
            Server: http://localhost:4000 · Web: http://localhost:5173
          </p>

          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            Run tests
          </h3>
          <CodeBlock>{`yarn test`}</CodeBlock>
        </AssignmentSection>

        <div className="flex justify-center pt-4">
          <Button onClick={handleGetStarted} variant="secondary" size="lg">
            Get started
          </Button>
        </div>
      </div>
    </div>
  );
}

