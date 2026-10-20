module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  var redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  var redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return res.status(500).json({
      ok: false,
      error: "Dashboard storage is not configured"
    });
  }

  var base = redisUrl.replace(/\/+$/, "");
  var headers = {
    Authorization: "Bearer " + redisToken,
    "Content-Type": "application/json"
  };

  async function redis(command) {
    var response = await fetch(base, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(command)
    });

    var raw = await response.text();
    var result;

    try {
      result = JSON.parse(raw);
    } catch (e) {
      throw new Error(
        "Redis returned invalid JSON. HTTP " + response.status
      );
    }

    if (!response.ok || result.error) {
      throw new Error(
        "Redis " + command[0] + ": " +
        (typeof result.error === "string"
          ? result.error
          : JSON.stringify(result.error || result))
      );
    }

    return result.result;
  }

  function parseSession(raw) {
    if (!raw || typeof raw !== "string") return null;

    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  try {
    // Danh sách session mới dùng Redis Set.
    var ids = await redis([
      "SMEMBERS",
      "quizmaster:live:sessions:v2"
    ]);

    var sessionIds = Array.isArray(ids) ? ids.slice(0, 100) : [];

    var sessions = await Promise.all(
      sessionIds.map(async function (id) {
        var raw = await redis([
          "GET",
          "quizmaster:live:session:" + String(id)
        ]);

        return parseSession(raw);
      })
    );

    sessions = sessions.filter(Boolean);

    var latestRaw = await redis([
      "GET",
      "quizmaster:live:latest"
    ]);

    var latest = parseSession(latestRaw);

    if (sessions.length === 0 && latest) {
      sessions = [latest];
    } else if (latest && latest.sessionId) {
      var exists = sessions.some(function (session) {
        return session.sessionId === latest.sessionId;
      });

      if (!exists) sessions.push(latest);
    }

    sessions.sort(function (a, b) {
      return (
        (Date.parse(b.updatedAt || "") || 0) -
        (Date.parse(a.updatedAt || "") || 0)
      );
    });

    return res.status(200).json({
      ok: true,
      data: sessions[0] || latest || null,
      sessions: sessions
    });
  } catch (error) {
    console.error("[api/dashboard.js]", error);

    return res.status(500).json({
      ok: false,
      error: "Unable to load dashboard",
      detail: String(error.message || error)
    });
  }
};
```
