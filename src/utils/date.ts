import moment, { Moment } from "moment";

export const getToday = (): Moment => moment();

export interface Week {
    begin: Moment;
    end: Moment;
}

export interface MonthDay {
    groupNum: number;
    day: Moment;
    dayNum: number;
    week: number;
    yearWeek: number;
    isToday: boolean;
    isThisMonth: boolean;
    key: string;
}

export interface GetMonthOptions {
    fullWeeks?: boolean;
}

export const getMonth = (month: number, year: number, opts?: GetMonthOptions): MonthDay[] => {
    const fullWeeks = opts ? opts.fullWeeks : true;

    const days: MonthDay[] = [];
    const monthStr = (month < 10 ? "0" : "") + month;
    const tempStart = moment(`${year}-${monthStr}-01`, "YYYY-MM-DD");

    const endMonth = month < 12 ? month + 1 : 1;
    const endYear = month < 12 ? year : year + 1;

    const start = fullWeeks ? tempStart.startOf("isoWeek") : tempStart;
    const tempEnd = moment(`${endYear}-${endMonth}-01`, "YYYY-MM-DD").subtract(1, "day");

    const end = fullWeeks ? tempEnd.endOf("isoWeek") : tempEnd;
    const today = getToday();

    let tempWeek = 0;
    let groupNum = 0;

    for (; start.isBefore(end); start.add(1, "day")) {
        const day = start.clone();
        const dayNum = start.day();
        const week = start.isoWeek();

        if (week !== tempWeek) {
            groupNum += 1;
            tempWeek = week;
        }

        const monthNum = start.month().valueOf() + 1;
        const yearWeek = parseInt(`${start.year()}${week}`, 10);
        const key = getDateKey(day);
        const monthDay: MonthDay = {
            groupNum,
            day,
            dayNum,
            week,
            yearWeek,
            isToday: day.isSame(today, "day"),
            isThisMonth: month === monthNum,
            key
        };
        days.push(monthDay);
    }

    return days;
};

export const getDateKey = (day: Moment): string => `r${day.format("YYYYMMDD")}`;
export const getKeyDate = (key: string): Moment => moment(key.replace("r", ""), "YYYYMMDD");
