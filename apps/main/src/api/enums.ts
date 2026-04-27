export enum HOLIDAY_SCOPE {
  PUBLIC = 1,
  PERSONALLEAVE = 2,
  MULTIUSERCOMPANY = 3,
}

export enum HOLIDAY_STATUS {
  PENDING = 1,
  APPROVED = 2,
  DECLINED = 3,
  CANCELLED = 4,
}

export enum HOLIDAY_DURATION {
  FULL_DAY = 1,
  FIRST_HALF = 2, // checks shift.lunchStart
  SECOND_HALF = 3, // checks shift.lunchEnd
}

export enum HolidayListType {
  DAY = 1,
  WEEK = 2,
  MONTH = 3,
  YEAR = 4,
}

export const HOLIDAY_SCOPE_LABEL: Record<HOLIDAY_SCOPE, string> = {
  [HOLIDAY_SCOPE.PUBLIC]: "Public Holiday",
  [HOLIDAY_SCOPE.PERSONALLEAVE]: "Personal Leave",
  [HOLIDAY_SCOPE.MULTIUSERCOMPANY]: "Company Holiday",
};

export const HOLIDAY_STATUS_LABEL: Record<HOLIDAY_STATUS, string> = {
  [HOLIDAY_STATUS.PENDING]: "Pending",
  [HOLIDAY_STATUS.APPROVED]: "Approved",
  [HOLIDAY_STATUS.DECLINED]: "Declined",
  [HOLIDAY_STATUS.CANCELLED]: "Cancelled",
};

export const HOLIDAY_DURATION_LABEL: Record<HOLIDAY_DURATION, string> = {
  [HOLIDAY_DURATION.FULL_DAY]: "Full Day",
  [HOLIDAY_DURATION.FIRST_HALF]: "First Half",
  [HOLIDAY_DURATION.SECOND_HALF]: "Second Half",
};

export const HOLIDAY_STATUS_COLOR: Record<HOLIDAY_STATUS, string> = {
  [HOLIDAY_STATUS.PENDING]: "bg-yellow-100 text-yellow-700 border-yellow-200",
  [HOLIDAY_STATUS.APPROVED]: "bg-green-100 text-green-700 border-green-200",
  [HOLIDAY_STATUS.DECLINED]: "bg-red-100 text-red-700 border-red-200",
  [HOLIDAY_STATUS.CANCELLED]: "bg-gray-100 text-gray-500 border-gray-200",
};
