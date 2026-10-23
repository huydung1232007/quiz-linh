export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET','POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return res.status(500).json({ ok: false, error: 'Missing Redis Config' });

  try {
    const base = url.replace(/\/+$/, "");
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    
    // Hàm gọi Redis an toàn, không dùng pipeline để tránh lỗi Vercel
    async function redis(command) {
      const r = await fetch(base, { method: "POST", headers, body: JSON.stringify(command) });
      const data = await r.json();
      if (!r.ok || data.error) throw new Error(data.error || 'Redis unavailable');
      return data.result;
    }

    if(req.method==='POST'){
      const input=req.body || {}, sessionId=String(input.sessionId || '');
      if(input.action!=='delete' || !/^[a-zA-Z0-9_-]{1,150}$/.test(sessionId))return res.status(400).json({ok:false,error:'Lượt thi không hợp lệ.'});
      const expected=process.env.DASHBOARD_NOTIFY_KEY;
      if(!expected)return res.status(503).json({ok:false,error:'Chưa cấu hình khóa quản lý DASHBOARD_NOTIFY_KEY.'});
      if(typeof input.notifyKey!=='string' || input.notifyKey!==expected)return res.status(401).json({ok:false,error:'Khóa quản lý không đúng.'});
      const script=`
        local sid=ARGV[1]
        redis.call('SET', KEYS[1], '1')
        local ids=redis.call('ZRANGE', 'quizmaster:notifications:session:'..sid, 0, -1)
        for _,id in ipairs(ids) do
          redis.call('DEL', 'quizmaster:notifications:item:'..id, 'quizmaster:notifications:ack:'..id)
          redis.call('ZREM', 'quizmaster:notifications:replies', id)
        end
        redis.call('DEL', 'quizmaster:live:session:'..sid, 'quizmaster:live:questions:'..sid,
          'quizmaster:notifications:session:'..sid, 'quizmaster:notifications:limit:'..sid,
          'quizmaster:telegram:event:'..sid..':START', 'quizmaster:telegram:event:'..sid..':SUBMIT')
        redis.call('SREM', 'quizmaster:live:sessions:v2', sid)
        local latest=redis.call('GET', 'quizmaster:live:latest')
        if latest then
          local ok,value=pcall(cjson.decode,latest)
          if ok and type(value)=='table' and value.sessionId==sid then redis.call('DEL','quizmaster:live:latest') end
        end
        return 1`;
      await redis(['EVAL',script,1,`quizmaster:deleted:session:${sessionId}`,sessionId]);
      return res.status(200).json({ok:true,deleted:true,sessionId});
    }
    if (req.query?.question !== undefined) {
      const sessionId=String(req.query.sessionId || ''), number=Number(req.query.question);
      if(!/^[a-zA-Z0-9_-]{1,150}$/.test(sessionId) || !Number.isInteger(number) || number<1 || number>200) return res.status(400).json({ok:false,error:'Câu hỏi hoặc lượt thi không hợp lệ.'});
      const records=await redis(['MGET',`quizmaster:live:questions:${sessionId}`,`quizmaster:live:session:${sessionId}`]);
      const bank=JSON.parse(records?.[0] || 'null'), session=JSON.parse(records?.[1] || 'null');
      const question=bank?.[number-1] || (session?.currentQuestionData?.number===number ? session.currentQuestionData : null);
      if(!session || !question) return res.status(404).json({ok:false,error:'Chưa có nội dung câu này. Học viên cần tải lại trang và tiếp tục bài để đồng bộ đề.'});
      return res.status(200).json({ok:true,sessionId,question:{...question,selected:null}});
    }
    // Lấy danh sách ID các thí sinh đang thi từ key v2
    const ids = await redis(["SMEMBERS", "quizmaster:live:sessions:v2"]) || [];
    
    // Lấy dữ liệu hoạt động gần nhất
    const keys = ids.map(id => `quizmaster:live:session:${String(id).replace(/[^a-zA-Z0-9_-]/g, '_')}`);
    const records = await redis(['MGET', 'quizmaster:live:latest', ...keys]) || [];
    const latestRaw = records[0];
    let latest = null;
    try { if (latestRaw) latest = JSON.parse(latestRaw); } catch(e){}

    // Lấy chi tiết từng lượt thi
    const sessions = [];
    for (const raw of records.slice(1)) {
        if (raw) {
            try { sessions.push(JSON.parse(raw)); } catch(e){}
        }
    }
    
    // Sắp xếp người mới thao tác lên đầu
    sessions.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    if (!sessions.length && latest) sessions.push(latest);

    return res.status(200).json({ ok: true, data: sessions[0] || latest || null, sessions });
  } catch (err) {
    console.error("[api/dashboard.js]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
