import {Router} from 'express';
import {sql} from '../db/index.js';

const router = Router();

async function getSports() {
  return await sql`
    SELECT id, name
    FROM sports
    ORDER BY name;
  `;
}


async function getSportsMap() {
  const sports = await getSports();

  return sports.reduce((acc, sport) => {
    acc[sport.name] = sport.id;
    return acc;
  }, {});
}


router.get("/sports", async (req, res, next) => {
  try {
    const sports = await getSportsMap();

    res.json({
      success: true,
      sports
    });
  } catch (err) {
    next(err);
  }
});


router.get("/", async (req, res, next) => {
  try {
    const { day, sport_id, page = 1, limit = 10 } = req.query;

    if (!day) {
      return res.status(400).json({ error: "day is required" });
    }

    // Convert to numbers and validate
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 items per page
    const offset = (pageNum - 1) * limitNum;

    /* -----------------------------
       1. Get total count first
    ------------------------------ */
    const [countResult] = await sql`
      SELECT COUNT(*) as total
      FROM events e
      WHERE e.day = ${day}
      ${sport_id ? sql`AND e.sport_id = ${sport_id}` : sql``}
    `;
    
    const totalEvents = parseInt(countResult.total);
    const totalPages = Math.ceil(totalEvents / limitNum);

    /* -----------------------------
       2. Fetch events (with pagination)
    ------------------------------ */
    const events = await sql`
      SELECT
        e.id,
        e.title,
        e.event_type,
        e.start_time,
        e.status,
        s.name AS sport,
        v.name AS venue,
        v.location AS venue_location,
        er.winner_display_name,
        er.result_data
      FROM events e
      JOIN sports s ON s.id = e.sport_id
      JOIN venues v ON v.id = e.venue_id
      LEFT JOIN event_results er ON er.event_id = e.id
      WHERE e.day = ${day}
      ${sport_id ? sql`AND e.sport_id = ${sport_id}` : sql``}
      ORDER BY
        CASE e.status
          WHEN 'live' THEN 1
          WHEN 'upcoming' THEN 2
          WHEN 'completed' THEN 3
        END,
        e.start_time
      LIMIT ${limitNum}
      OFFSET ${offset};
    `;

    /* --------------------------------
       3. Fetch participants for teams
    --------------------------------- */
    const teamEventIds = events
      .filter(e => e.event_type === "team")
      .map(e => e.id);

    let participantsMap = {};

    if (teamEventIds.length) {
  // Build the query dynamically based on array length
  const placeholders = teamEventIds.map((id, i) => `$${i + 1}`).join(',');
  
  const participants = await sql.query(
    `SELECT
      ep.event_id,
      t.name AS team_name
    FROM event_participants ep
    JOIN teams t ON t.id = ep.team_id
    WHERE ep.event_id IN (${placeholders})`,
    teamEventIds
  );

  for (const row of participants) {
    if (!participantsMap[row.event_id]) {
      participantsMap[row.event_id] = [];
    }
    participantsMap[row.event_id].push({
      name: row.team_name
    });
  }
}

    /* -----------------------------
       4. Shape final response
    ------------------------------ */
    const response = events.map(e => {
      const base = {
        id: e.id,
        title: e.title,
        sport: e.sport,
        event_type: e.event_type,
        start_time: e.start_time,
        venue: e.venue,
        venue_location: e.venue_location,
        status: e.status
      };

      // TEAM EVENTS
      if (e.event_type === "team") {
        base.participants =
          participantsMap[e.id]?.length
            ? participantsMap[e.id]
            : [{ name: "TBD" }, { name: "TBD" }];
      }

      // COMPLETED EVENTS → result
      if (e.status === "completed" && e.result_data) {
        base.result = {
          winner: e.winner_display_name,
          ...e.result_data
        };
      }

      return base;
    });

    res.json({
      day,
      events: response,
      pagination: {
        current_page: pageNum,
        per_page: limitNum,
        total_events: totalEvents,
        total_pages: totalPages,
        has_next: pageNum < totalPages,
        has_prev: pageNum > 1
      }
    });

  } catch (err) {
    next(err);
  }
});

export default router;