// Compatibility endpoint for older clients. Telegram delivery is handled by /api/track.
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ok:false,error:'Method Not Allowed'});
  }
  return res.status(200).json({ok:true,retired:true});
};
