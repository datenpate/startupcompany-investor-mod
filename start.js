(function () {
  // TODO implement exit share sale

  const rs = GetRootScope();
  // bind to specific game version to make sure to not crash anything
  if (rs.Configuration.BETA_VERSION !== 8 && rs.Configuration.BETA_SUBVERSION !== 8) {return;}

  // add global new day event
  if (!GameEvents.OnNewDay) GameEvents.OnNewDay = 'OnNewDay';
  rs.settings.lastDayHandled = rs.settings.date;
  rs.$on(GameEvents.OnNewHour, () => {
    if (!moment(rs.settings.lastDayHandled).isSame(rs.settings.date, 'day')) {
      rs.settings.lastDayHandled = rs.settings.date;
      rs.$broadcast(GameEvents.OnNewDay);
      console.log('Broadcast: GameEvents.OnNewDay');
    }
  });

  // init shares array
  // TODO maybe introduce a "mods" namespace
  const initSharesSettings = () => {
    if (!rs.settings.shares) {rs.settings.shares = [];}
  }
  initSharesSettings();

  // TODO add more funding options
  const funds = [
    {
      name: 'GlobalInvest Early Stage Seed',
      price: 80000,
      amount: 7,
      conditions: (fund, rootScope) => {return rootScope.companyTier === 1;}
    }
  ];

  const sellShare = (fund) => {
    const sumShares = rs.settings.shares.reduce((acc, share) => {
      return acc + share.amount;
    }, 0);

    if (sumShares + fund.amount >= 100) {
      rs.showMessage('Not enough shares left', `You cannot sell ${fund.amount} shares of your company. Only ${100 - sumShares} shares are left.`);
      return;
    }

    rs.settings.shares.push(fund);

    rs.settings.balance += fund.price;
    rs.addTransaction(`Sold ${fund.amount} shares to ${fund.name}`, fund.price);
  }

  // handle day change
  if (!GameEvents.OnNewDay) GameEvents.OnNewDay = 'OnNewDay';
  rs.$on(GameEvents.OnNewDay, () => {
    // make sure that shares are created on first day (the is a bug in SC, that is not creating the settings before first save)
    if (!rs.settings) {rs.settings = {};}
    initSharesSettings();

    // handle payouts
    const dailyProfit = rs.financeData.profit.perHour * 24;
    rs.settings.shares.forEach((share, index) => {
      const payout = (dailyProfit / 100) * share.amount;
      rs.settings.balance -= payout;
      rs.addTransaction(`Share payout to ${share.name}`, -payout);
    });

    // handle proposals
    funds.forEach((fund) => {
      if (!fund.conditions(fund, rs)) {return;}
      if (rs.settings.shares.find((share) => {return fund.name === share.name})) {return;}

      rs.confirm('New investor proposal', `Investor "${fund.name}" is interested to invest ${fund.price} into your company. They want ${fund.amount}% of your shares in return. So they will get a cut of ${fund.amount}% of your daily profit`, () => {
        sellShare(fund);
      });
    });

  });

  // make function available for debugging
  global.sellShare = sellShare;
})();
