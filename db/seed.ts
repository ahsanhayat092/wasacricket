import { seedTournament } from "../api/queries/seed";

seedTournament()
  .then((res) => {
    console.log(res.seeded ? "Seeded tournament." : "Already seeded.", res);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
