import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'GFO Platform API';
  }

  getDashboard() {
    return {
      netWorth: 3845250,
      liquidity: 320500,
      investments: 1985000,
      realEstate: 1540000,
      liabilities: 0,
    };
  }
}