import { asc, eq, isNull } from "drizzle-orm";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDb } from "@/db";
import { appUsers, participants } from "@/db/schema";
import { assignParticipantSpotifyId, promoteUserToAdmin } from "../actions";

export default async function AdminUsersPage() {
  const db: ReturnType<typeof getDb> = getDb();
  const users: Array<typeof appUsers.$inferSelect> = await db
    .select()
    .from(appUsers)
    .orderBy(asc(appUsers.createdAt));
  const unclaimedProfiles: Array<{
    id: string;
    displayName: string;
    spotifyAccountId: string | null;
  }> = await db
    .select({
      id: participants.id,
      displayName: participants.displayName,
      spotifyAccountId: participants.spotifyAccountId,
    })
    .from(participants)
    .leftJoin(appUsers, eq(appUsers.claimedParticipantId, participants.id))
    .where(isNull(appUsers.id))
    .orderBy(asc(participants.displayName));
  return (
    <>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-stone-950">
          People
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          Manage registered accounts and connect unclaimed member profiles.
        </p>
      </div>
      <Card className="mt-6 gap-0 overflow-hidden rounded-2xl py-0">
        <CardHeader className="border-b px-5 py-5 sm:px-6">
          <CardTitle>Registered users</CardTitle>
          <CardDescription>{users.length} Discord accounts</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-stone-50/70 hover:bg-stone-50/70">
                <TableHead className="h-12 pl-5 sm:pl-6">User</TableHead>
                <TableHead className="h-12">Role</TableHead>
                <TableHead className="h-12 pr-5 text-right sm:pr-6">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="hover:bg-transparent">
                  <TableCell className="py-4 pl-5 sm:pl-6">
                    <p className="font-medium leading-5">
                      {user.discordDisplayName ?? user.discordUsername}
                    </p>
                    <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                      @{user.discordUsername}
                    </p>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge
                      variant={user.role === "admin" ? "default" : "outline"}
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4 pr-5 text-right sm:pr-6">
                    {user.role === "admin" ? (
                      <span className="text-sm text-muted-foreground">
                        Admin
                      </span>
                    ) : (
                      <form action={promoteUserToAdmin.bind(null, user.id)}>
                        <Button size="sm" variant="outline">
                          Make admin
                        </Button>
                      </form>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card className="mt-6 rounded-2xl">
        <CardHeader>
          <CardTitle>Unclaimed profiles</CardTitle>
          <CardDescription>
            Associate a Spotify user ID before the person registers.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {unclaimedProfiles.map((profile) => (
            <form
              key={profile.id}
              action={assignParticipantSpotifyId.bind(null, profile.id)}
              className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end"
            >
              <div>
                <p className="font-medium">{profile.displayName}</p>
                <p className="text-xs text-muted-foreground">Unclaimed</p>
              </div>
              <Input
                name="spotifyAccountId"
                defaultValue={profile.spotifyAccountId ?? ""}
                placeholder="Spotify user ID"
                aria-label={`Spotify user ID for ${profile.displayName}`}
                required
              />
              <Button type="submit" variant="outline">
                Save
              </Button>
            </form>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
