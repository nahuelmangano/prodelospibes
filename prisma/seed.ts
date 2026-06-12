import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import teamsData from "./data/worldcup.teams.json";
import worldcupData from "./data/worldcup.json";
import stadiumsData from "./data/worldcup.stadiums.json";
import squadsData from "./data/worldcup.squads.json";

const prisma = new PrismaClient();

type TeamSeed = {
  name: string;
  continent: string;
  flag_icon: string;
  fifa_code: string;
  group: string;
  confed: string;
};

type MatchSeed = {
  round: string;
  date: string;
  time: string;
  team1: string;
  team2: string;
  group?: string;
  ground: string;
};

type StadiumSeed = {
  city: string;
  timezone: string;
  cc: string;
  name: string;
  capacity: number;
  coords: string;
};

type SquadSeed = {
  name: string;
  fifa_code: string;
  group: string;
  players: Array<{
    number: number;
    pos: string;
    name: string;
    date_of_birth: string;
  }>;
};

async function upsertUser(name: string, username: string, password: string, role: Role) {
  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { username },
    update: { name, password: hashed, role },
    create: { name, username, password: hashed, role },
  });
}

function parseMatchDate(date: string, time: string) {
  const match = time.match(/^(\d{2}:\d{2}) UTC([+-]\d{1,2})$/);
  if (!match) {
    throw new Error(`Horario inválido: ${date} ${time}`);
  }

  const [, clock, offset] = match;
  const sign = offset.startsWith("-") ? "-" : "+";
  const hours = offset.replace(/[+-]/, "").padStart(2, "0");
  return new Date(`${date}T${clock}:00${sign}${hours}:00`);
}

function matchStage(item: MatchSeed) {
  return item.group ? item.group.replace("Group", "Grupo") : item.round;
}

function resolveTeamName(name: string) {
  const aliases: Record<string, string> = {
    "Bosnia and Herzegovina": "Bosnia & Herzegovina",
    "United States": "USA",
  };

  return aliases[name] ?? name;
}

async function main() {
  await upsertUser("Administrador", "admin", "admin123", Role.ADMIN);

  for (const name of ["Apache", "Chueco", "Mati", "Rulo", "Nehu", "Nahu", "Nico"]) {
    await upsertUser(name, name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, ""), "1234", Role.PLAYER);
  }

  const teams = teamsData as TeamSeed[];
  for (const team of teams) {
    await prisma.team.upsert({
      where: { name: team.name },
      update: {
        flagEmoji: team.flag_icon,
        fifaCode: team.fifa_code,
        continent: team.continent,
        groupName: team.group,
        confed: team.confed,
      },
      create: {
        name: team.name,
        flagEmoji: team.flag_icon,
        fifaCode: team.fifa_code,
        continent: team.continent,
        groupName: team.group,
        confed: team.confed,
      },
    });
  }

  const stadiums = stadiumsData.stadiums as StadiumSeed[];
  for (const stadium of stadiums) {
    await prisma.stadium.upsert({
      where: { city: stadium.city },
      update: {
        name: stadium.name,
        timezone: stadium.timezone,
        country: stadium.cc,
        capacity: stadium.capacity,
        coords: stadium.coords,
      },
      create: {
        city: stadium.city,
        name: stadium.name,
        timezone: stadium.timezone,
        country: stadium.cc,
        capacity: stadium.capacity,
        coords: stadium.coords,
      },
    });
  }

  const matches = worldcupData.matches as MatchSeed[];
  const knownTeams = new Set(teams.map((team) => team.name));
  const fixtureTeamNames = new Set(matches.flatMap((match) => [match.team1, match.team2]));
  for (const name of fixtureTeamNames) {
    if (knownTeams.has(name)) continue;

    await prisma.team.upsert({
      where: { name },
      update: { flagEmoji: "🏆" },
      create: { name, flagEmoji: "🏆" },
    });
  }

  const allTeams = await prisma.team.findMany();
  const byName = new Map(allTeams.map((team) => [team.name, team]));
  const allStadiums = await prisma.stadium.findMany();
  const stadiumByCity = new Map(allStadiums.map((stadium) => [stadium.city, stadium]));

  for (const item of matches) {
    const homeTeam = byName.get(resolveTeamName(item.team1));
    const awayTeam = byName.get(resolveTeamName(item.team2));
    const stadium = stadiumByCity.get(item.ground);
    if (!homeTeam || !awayTeam) continue;

    const matchDate = parseMatchDate(item.date, item.time);

    await prisma.match.upsert({
      where: {
        homeTeamId_awayTeamId_matchDate: {
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          matchDate,
        },
      },
      update: {
        stadiumId: stadium?.id,
        stage: matchStage(item),
        round: item.round,
        groupName: item.group ?? null,
      },
      create: {
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        stadiumId: stadium?.id,
        matchDate,
        stage: matchStage(item),
        round: item.round,
        groupName: item.group ?? null,
      },
    });
  }

  const squads = squadsData as SquadSeed[];
  for (const squad of squads) {
    const team = byName.get(resolveTeamName(squad.name));
    if (!team) continue;

    for (const player of squad.players) {
      await prisma.squadPlayer.upsert({
        where: {
          teamId_number_name: {
            teamId: team.id,
            number: player.number,
            name: player.name,
          },
        },
        update: {
          position: player.pos,
          dateOfBirth: player.date_of_birth ? new Date(`${player.date_of_birth}T00:00:00.000Z`) : null,
        },
        create: {
          teamId: team.id,
          number: player.number,
          position: player.pos,
          name: player.name,
          dateOfBirth: player.date_of_birth ? new Date(`${player.date_of_birth}T00:00:00.000Z`) : null,
        },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
