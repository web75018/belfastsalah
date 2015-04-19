belfastsalah.services.factory('PrayerTimes', function(PRAYER_DATA, Settings){
  var p = {
    month: 0, 
    day: 1, 
    fajr: 2, 
    shuruq: 3, 
    duhr: 4, 
    asr: 5, 
    asr2: 6, 
    maghrib: 7, 
    isha: 8
  };

  function getByDateNoDST (date) {
    var inMonth = '' + (date.getMonth()+1);
    var inDay = '' + date.getDate();
    
    var cache = (getByDateNoDST.cache = getByDateNoDST.cache || Object.create(null));
    indexFromCache = cache[inMonth+':'+inDay];

    if(angular.isDefined(indexFromCache)){
      return PRAYER_DATA[indexFromCache]; // cache hit
    } else {
      // cache miss, find it manually
      var indexFromFind = _.findIndex(PRAYER_DATA, function(v){
        return (v[p.month] === inMonth) && (v[p.day] === inDay);
      });

      // save it in the cache
      cache[inMonth+':'+inDay] = indexFromFind;

      // return result
      return PRAYER_DATA[indexFromFind];
    }
  }

  function offsetDST(date, time){
    if(typeof time == 'string' && time.indexOf(':') >= 0){
      var timeMoment = moment(timeToDate(date, time));
      if(timeMoment.isDST()){
        return timeMoment.add(1, 'hours').format('HH:mm');
      } else {
        return time;
      }
    } else {
      return time;
    }
  }

  function getByDate(date){
    return _.map(getByDateNoDST(date), function(time){
      return offsetDST(date, time);
    });
  }

  function getByMonthNoDST(monthNumber){
    var inMonth = ''+monthNumber;
    return _.map(_.filter(PRAYER_DATA, function(v){
      return v[p.month] === inMonth;
    }), function(v){
      return {
        day: v[p.day],
        fajr: v[p.fajr],
        shuruq: v[p.shuruq],
        duhr: v[p.duhr],
        asr: Settings.get('hanafiAsr') ? v[p.asr2] : v[p.asr],
        maghrib: v[p.maghrib],
        isha: v[p.isha]
      };
    });
  }

  function getByMonth(monthNumber){
    var noOffset = getByMonthNoDST(monthNumber);
    return _.map(noOffset, function(times){
      var monthDay = moment().month(monthNumber-1).date(times.day).toDate(); //today's year, different month/day
      return {
        day: times.day,
        fajr: offsetDST(monthDay, times.fajr),
        shuruq: offsetDST(monthDay, times.shuruq),
        duhr: offsetDST(monthDay, times.duhr),
        asr: offsetDST(monthDay, times.asr),
        maghrib: offsetDST(monthDay, times.maghrib),
        isha: offsetDST(monthDay, times.isha)
      };

    });
  }

  function timeToDate(baseDate,timeString){
    // if(!timeString || timeString.indexOf(':') === -1 ) return;
    var split = timeString.split(':');
    var hours = +split[0];
    var minutes = +split[1];
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes, 0, 0);
  }

  function getNextPrayer(date){
    var hanafiAsr = Settings.get('hanafiAsr');
    var tomorrowMoment = moment(date).hours(0).minutes(0).seconds(0).add(1, 'days');
    var tomorrow = tomorrowMoment.toDate();
    var yesterdayMoment = moment(date).hours(0).minutes(0).seconds(0).subtract(1, 'days');
    var yesterday = yesterdayMoment.toDate();

    var todaysTimes = getByDate(date);
    var tomorrowTimes = getByDate(tomorrow);
    var yesterdayTimes = getByDate(yesterday);

    var prev, next;

    var yesterdayIshaDate = timeToDate(yesterday, yesterdayTimes[p.isha]);
    var todayFajrDate = timeToDate(date, todaysTimes[p.fajr]);
    var todayShuruqDate = timeToDate(date, todaysTimes[p.shuruq]);
    var todayDuhrDate = timeToDate(date, todaysTimes[p.duhr]);
    var todayAsrDate = timeToDate(date, todaysTimes[hanafiAsr ? p.asr2 : p.asr]);
    var todayMaghribDate = timeToDate(date, todaysTimes[p.maghrib]);
    var todayIshaDate = timeToDate(date, todaysTimes[p.isha]);
    var tomorrowFajrDate = timeToDate(tomorrow, tomorrowTimes[p.fajr]);

    // not yet fajr
    if(date < todayFajrDate){
      prev = {
        name: 'Isha',
        date: yesterdayIshaDate
      };

      next = {
        name: 'Fajr',
        date: todayFajrDate
      };
    } else if(date > todayFajrDate && date < todayShuruqDate){
      prev = {
        name: 'Fajr',
        date: todayFajrDate
      };
      
      next = {
        name: 'Duhr',
        date: todayDuhrDate
      };
    } else if(date > todayShuruqDate && date < todayDuhrDate){
      prev = {
        name: 'Shuruq',
        date: todayShuruqDate
      };
      
      next = {
        name: 'Duhr',
        date: todayDuhrDate
      };
    } else if(date > todayDuhrDate && date < todayAsrDate){
      prev = {
        name: 'Duhr',
        date: todayDuhrDate
      };
      
      next = {
        name: 'Asr',
        date: todayAsrDate
      };
    } else if(date > todayAsrDate && date < todayMaghribDate){
      prev = {
        name: 'Asr',
        date: todayAsrDate
      };
      
      next = {
        name: 'Maghrib',
        date: todayMaghribDate
      };
    } else if(date > todayMaghribDate && date < todayIshaDate){
      prev = {
        name: 'Maghrib',
        date: todayMaghribDate
      };
      
      next = {
        name: 'Isha',
        date: todayIshaDate
      };
    } else if(date > todayIshaDate && date < tomorrowFajrDate){
      prev = {
        name: 'Isha',
        date: todayIshaDate
      };
      
      next = {
        name: 'Fajr',
        date: tomorrowFajrDate
      };
    }

    prev.fromNow = moment(prev.date).fromNow();
    next.fromNow = moment(next.date).fromNow();

    return {
      prev: prev,
      next: next
    }
  }

  function hasHanafiAsr(){
    return !!PRAYER_DATA[0][6];
  }

  return {
    getByDate: getByDate,
    getByMonth: getByMonth,
    getNextPrayer: getNextPrayer,
    timeToDate: timeToDate,
    KEYS: p,
    hasHanafiAsr: hasHanafiAsr
  };
});