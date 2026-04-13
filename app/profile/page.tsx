"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileGeneralSettings from "@/components/profile/profile-general-settings";
import ProfileEmailChange from "@/components/profile/profile-email-change";
import ProfilePasswordChange from "@/components/profile/profile-password-change";
import ProfileStatistics from "@/components/profile/profile-statistics";
import ProfileDanger from "@/components/profile/profile-danger";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("general");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    fetchUser();
  }, [supabase]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Wird geladen...</p>
      </div>
    );
  }

  return (
    <main className="container py-8 md:py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Profil</h1>
          <p className="text-muted-foreground">Verwalte dein Konto und deine Einstellungen</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="general">Allgemein</TabsTrigger>
            <TabsTrigger value="email">E-Mail</TabsTrigger>
            <TabsTrigger value="password">Passwort</TabsTrigger>
            <TabsTrigger value="statistics">Statistiken</TabsTrigger>
            <TabsTrigger value="danger" className="text-red-600">
              Gefahr
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <ProfileGeneralSettings user={user} />
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <ProfileEmailChange user={user} />
          </TabsContent>

          <TabsContent value="password" className="space-y-4">
            <ProfilePasswordChange />
          </TabsContent>

          <TabsContent value="statistics" className="space-y-4">
            <ProfileStatistics user={user} />
          </TabsContent>

          <TabsContent value="danger" className="space-y-4">
            <ProfileDanger user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
