"use client";

import { BsFillTelephoneForwardFill } from "react-icons/bs";
import { IoIosChatbubbles } from "react-icons/io";
import { MdEmail, MdSocialDistance } from "react-icons/md";

export const CHANNEL_TYPE_LABELS = {
  1: "Telephony",
  2: "Chat",
  3: "Email",
  4: "Social",
  telephony: "Telephony",
  chat: "Chat",
  email: "Email",
  social: "Social",
};

const baseIconClassName = "h-4 w-4";

const normalizeWhitespace = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

export const normalizeChannelTypeKey = (channelType) => {
  const normalizedType = normalizeWhitespace(channelType).toLowerCase();

  if (!normalizedType) {
    return "";
  }

  if (["1", "2", "3", "4"].includes(normalizedType)) {
    return normalizedType;
  }

  const compactType = normalizedType.replace(/[\s_-]+/g, "");

  if (
    normalizedType === "telephony" ||
    compactType === "telephony" ||
    normalizedType === "telephone"
  ) {
    return "1";
  }

  if (normalizedType === "chat" || compactType === "chat") {
    return "2";
  }

  if (normalizedType === "email" || compactType === "email") {
    return "3";
  }

  if (normalizedType === "social" || compactType === "social") {
    return "4";
  }

  return normalizedType;
};

export const formatChannelTypeLabel = (channelType) => {
  const normalizedKey = normalizeChannelTypeKey(channelType);

  if (CHANNEL_TYPE_LABELS[normalizedKey]) {
    return CHANNEL_TYPE_LABELS[normalizedKey];
  }

  const cleanValue = normalizeWhitespace(channelType);

  if (!cleanValue) {
    return "";
  }

  return cleanValue.replace(/\b\w/g, (char) => char.toUpperCase());
};

export const getChannelTypeVisual = (channelType) => {
  const normalizedType = normalizeChannelTypeKey(channelType);

  switch (normalizedType) {
    case "1":
      return {
        label: CHANNEL_TYPE_LABELS[1],
        Icon: BsFillTelephoneForwardFill,
        className: `${baseIconClassName} text-sky-600`,
      };
    case "2":
      return {
        label: CHANNEL_TYPE_LABELS[2],
        Icon: IoIosChatbubbles,
        className: `${baseIconClassName} text-emerald-600`,
      };
    case "3":
      return {
        label: CHANNEL_TYPE_LABELS[3],
        Icon: MdEmail,
        className: `${baseIconClassName} text-amber-600`,
      };
    case "4":
      return {
        label: CHANNEL_TYPE_LABELS[4],
        Icon: MdSocialDistance,
        className: `${baseIconClassName} text-violet-600`,
      };
    default:
      return null;
  }
};

const ChannelTypeIcon = ({ channelType, className = "", showLabel = false }) => {
  const visual = getChannelTypeVisual(channelType);

  if (!visual) {
    return (
      <span className="text-[10px]">
        {formatChannelTypeLabel(channelType) || "-"}
      </span>
    );
  }

  const { Icon, label, className: iconClassName } = visual;

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      title={label}
      aria-label={label}
    >
      <Icon className={iconClassName} />
      {showLabel ? <span className="text-[10px]">{label}</span> : null}
    </span>
  );
};

export default ChannelTypeIcon;
