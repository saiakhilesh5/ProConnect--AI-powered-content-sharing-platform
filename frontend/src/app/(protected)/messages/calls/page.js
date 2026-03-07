"use client";

import { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { useCall } from "@/context/CallContext";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import {
  Phone,
  Video,
  PhoneOutgoing,
  PhoneIncoming,
  PhoneMissed,
  ArrowLeft,
  Clock,
  Search,
  Filter,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function CallHistoryPage() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, missed, outgoing, incoming
  const [searchQuery, setSearchQuery] = useState("");
  const api = useApi();
  const { user } = useAuth();

  useEffect(() => {
    fetchCallHistory();
  }, []);

  const fetchCallHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/messages/calls/history");
      if (response.data?.data?.calls) {
        setCalls(response.data.data.calls);
      }
    } catch (error) {
      console.error("Error fetching call history:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter calls based on type
  const filteredCalls = calls.filter((call) => {
    const isOutgoing = call.caller?._id === user?._id;
    const isMissed = call.status === "missed" || (call.status === "declined" && !isOutgoing);

    // Apply filter
    if (filter === "missed" && !isMissed) return false;
    if (filter === "outgoing" && !isOutgoing) return false;
    if (filter === "incoming" && isOutgoing) return false;

    // Apply search
    if (searchQuery.trim()) {
      const otherUser = getOtherParticipant(call);
      const name = otherUser?.fullName?.toLowerCase() || "";
      const username = otherUser?.username?.toLowerCase() || "";
      const query = searchQuery.toLowerCase();
      if (!name.includes(query) && !username.includes(query)) return false;
    }

    return true;
  });

  // Get the other participant in the call
  const getOtherParticipant = (call) => {
    if (call.conversation?.isGroup) {
      return {
        fullName: call.conversation.groupName,
        profilePicture: call.conversation.groupImage,
        isGroup: true,
      };
    }
    
    const participant = call.participants?.find(
      (p) => p.user?._id !== user?._id
    )?.user;
    
    return participant || call.caller;
  };

  // Get call status icon and color
  const getCallStatusInfo = (call) => {
    const isOutgoing = call.caller?._id === user?._id;
    const isMissed = call.status === "missed" || (call.status === "declined" && !isOutgoing);

    if (isMissed) {
      return {
        icon: PhoneMissed,
        color: "text-red-500",
        label: "Missed",
      };
    }
    if (isOutgoing) {
      return {
        icon: PhoneOutgoing,
        color: "text-green-500",
        label: "Outgoing",
      };
    }
    return {
      icon: PhoneIncoming,
      color: "text-blue-500",
      label: "Incoming",
    };
  };

  // Format call duration
  const formatDuration = (seconds) => {
    if (!seconds) return "No answer";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  // Format call time
  const formatCallTime = (date) => {
    const callDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (callDate.toDateString() === today.toDateString()) {
      return `Today, ${format(callDate, "h:mm a")}`;
    }
    if (callDate.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${format(callDate, "h:mm a")}`;
    }
    return format(callDate, "MMM d, h:mm a");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/messages" className="p-2 hover:bg-muted rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </Link>
            <h1 className="text-xl font-bold text-foreground">Call History</h1>
          </div>

          {/* Search and Filter */}
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted border border-border focus-within:ring-1 focus-within:ring-primary">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                placeholder="Search calls..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-foreground placeholder-muted-foreground text-sm"
                style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="border-border">
                  <Filter className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                <DropdownMenuItem
                  onClick={() => setFilter("all")}
                  className={filter === "all" ? "bg-muted" : ""}
                >
                  All Calls
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFilter("missed")}
                  className={filter === "missed" ? "bg-muted" : ""}
                >
                  Missed Calls
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFilter("outgoing")}
                  className={filter === "outgoing" ? "bg-muted" : ""}
                >
                  Outgoing Calls
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFilter("incoming")}
                  className={filter === "incoming" ? "bg-muted" : ""}
                >
                  Incoming Calls
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Call List */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Phone className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground mb-2">No calls yet</p>
            <p className="text-muted-foreground">
              {filter !== "all"
                ? "No calls match your filter"
                : "Your call history will appear here"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filteredCalls.map((call, index) => {
                const otherUser = getOtherParticipant(call);
                const statusInfo = getCallStatusInfo(call);
                const StatusIcon = statusInfo.icon;

                return (
                  <motion.div
                    key={call._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
                  >
                    {/* User Avatar */}
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-muted">
                        {otherUser?.profilePicture ? (
                          <Image
                            src={otherUser.profilePicture}
                            alt={otherUser.fullName || "User"}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl font-semibold text-muted-foreground">
                            {(otherUser?.fullName?.[0] || "?").toUpperCase()}
                          </div>
                        )}
                      </div>
                      {/* Call Type Badge */}
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-card border-2 border-background flex items-center justify-center ${statusInfo.color}`}>
                        {call.callType === "video" ? (
                          <Video className="w-2.5 h-2.5" />
                        ) : (
                          <Phone className="w-2.5 h-2.5" />
                        )}
                      </div>
                    </div>

                    {/* Call Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">
                          {otherUser?.fullName || "Unknown"}
                        </p>
                        {otherUser?.isGroup && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                            Group
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <StatusIcon className={`w-3.5 h-3.5 ${statusInfo.color}`} />
                        <span>{statusInfo.label}</span>
                        <span>•</span>
                        <span>{call.callType === "video" ? "Video" : "Voice"}</span>
                      </div>
                    </div>

                    {/* Call Details */}
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {formatCallTime(call.createdAt)}
                      </p>
                      <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{formatDuration(call.duration)}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
