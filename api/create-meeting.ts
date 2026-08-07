import app from '../server';

export default function handler(req: any, res: any) {
  req.url = '/api/create-meeting';
  return app(req, res);
}
