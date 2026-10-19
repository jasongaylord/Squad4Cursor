import { defineAgent, defineSquad, defineTeam } from "@squad4cursor/sdk";

export default defineSquad({
  team: defineTeam({ name: "Hello Squad", members: ["@lead", "@backend", "@tester"] }),
  agents: [
    defineAgent({ name: "lead", role: "Lead" }),
    defineAgent({ name: "backend", role: "Backend" }),
    defineAgent({ name: "tester", role: "Tester" }),
  ],
  modelProfile: "balanced",
});
