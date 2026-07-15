import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CheckCircledIcon,
  CircleIcon,
  CrossCircledIcon,
  QuestionMarkCircledIcon,
  StopwatchIcon,
} from "@radix-ui/react-icons";

export const labels = [
  {
    value: "bug",
    label: "Bug",
  },
  {
    value: "feature",
    label: "Feature",
  },
  {
    value: "documentation",
    label: "Documentation",
  },
];

export const statuses = [
  {
    value: "backlog",
    label: "Backlog",
    icon: QuestionMarkCircledIcon,
  },
  {
    value: "todo",
    label: "Todo",
    icon: CircleIcon,
  },
  {
    value: "in progress",
    label: "In Progress",
    icon: StopwatchIcon,
  },
  {
    value: "done",
    label: "Done",
    icon: CheckCircledIcon,
  },
  {
    value: "canceled",
    label: "Canceled",
    icon: CrossCircledIcon,
  },
];

export const priorities = [
  {
    label: "Low",
    value: "low",
    icon: ArrowDownIcon,
  },
  {
    label: "Medium",
    value: "medium",
    icon: ArrowRightIcon,
  },
  {
    label: "High",
    value: "high",
    icon: ArrowUpIcon,
  },
];

export const isActiveStatuses = [
  {
    value: true,
    label: "Active",
    icon: CheckCircledIcon,
  },
  {
    value: false,
    label: "Inactive",
    icon: CrossCircledIcon,
  },
];

export const isAdminStatus = [
  {
    value: true,
    label: "Yes",
    icon: CheckCircledIcon,
  },
  {
    value: false,
    label: "No",
    icon: CrossCircledIcon,
  },
];

export const getIconsByKey = (key, value) => {
  switch (key) {
    case "isActive":
      return isActiveStatuses.find((item) => item.value === value).icon;
  }
};
