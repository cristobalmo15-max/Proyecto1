import app from '../server';

export default function handler(req: any, res: any) {
  req.url = '/api/send-report';
  return app(req, res);
}
