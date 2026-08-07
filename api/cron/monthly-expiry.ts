import app from '../../server';

export default function handler(req: any, res: any) {
  req.url = '/api/cron/monthly-expiry';
  return app(req, res);
}
