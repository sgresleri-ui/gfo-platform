import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getDashboard() {
    const liquidity = 230866.37;
    const investments = 1510854;
    const realEstate = 775000;
    const liabilities = 30400;

    const netWorth =
      liquidity +
      investments +
      realEstate -
      liabilities;

    return {
      netWorth,
      liquidity,
      investments,
      realEstate,
      liabilities,
    };
  }
}