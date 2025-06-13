"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const UserLink = ({
  user,
  showAvatar = true,
  showUsername = true,
  className = "",
  avatarSize = "default", // "sm", "default", "lg"
}) => {
  if (!user || !user.uid) {
    return (
      <span className={`text-muted-foreground ${className}`}>Unknown User</span>
    );
  }

  const avatarSizeClasses = {
    sm: "h-6 w-6",
    default: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const content = (
    <div className={`flex items-center gap-2 ${className}`}>
      {showAvatar && (
        <Avatar className={avatarSizeClasses[avatarSize]}>
          <AvatarImage src={user.avatar} />
          <AvatarFallback>
            {user.username?.charAt(0)?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
      )}
      {showUsername && (
        <span className="hover:underline">
          {user.username || "Unknown User"}
        </span>
      )}
    </div>
  );

  return (
    <Link
      href={`/user/${user.uid}`}
      className="inline-flex items-center transition-colors hover:text-primary"
    >
      {content}
    </Link>
  );
};

export default UserLink;
