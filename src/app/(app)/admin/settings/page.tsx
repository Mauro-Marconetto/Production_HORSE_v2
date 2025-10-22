
'use client';

import { useState, useMemo, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { RemitoSettings, UserProfile } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

function AdminSettingsPageClient() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'remitos') : null, [firestore]);
    const { data: settings, isLoading: isLoadingSettings } = useDoc<RemitoSettings>(settingsRef);

    const [isSaving, setIsSaving] = useState(false);
    const [nextRemitoNumber, setNextRemitoNumber] = useState<number | undefined>();
    const [cai, setCai] = useState<string>('');
    const [caiExpiration, setCaiExpiration] = useState<Date | undefined>();

    useEffect(() => {
        if (settings) {
            setNextRemitoNumber(settings.nextRemitoNumber);
            setCai(settings.cai);
            if (settings.caiExpiration) {
                setCaiExpiration(parseISO(settings.caiExpiration));
            }
        }
    }, [settings]);

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!firestore) return;

        setIsSaving(true);
        const settingsData: RemitoSettings = {
            nextRemitoNumber: Number(nextRemitoNumber) || 1,
            cai: cai,
            caiExpiration: caiExpiration ? caiExpiration.toISOString() : '',
        };

        try {
            const settingsDocRef = doc(firestore, 'settings', 'remitos');
            await setDoc(settingsDocRef, settingsData, { merge: true });

            toast({
                title: 'Éxito',
                description: 'Configuración guardada correctamente.',
            });
        } catch (error: any) {
            console.error('Error saving settings:', error);
            toast({
                title: 'Error',
                description: error.message || 'No se pudo guardar la configuración.',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoadingSettings) {
        return (
            <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Configuración de Remitos</CardTitle>
                <CardDescription>
                    Gestiona la numeración y la información fiscal para la generación de remitos.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSave} className="space-y-6 max-w-lg">
                    <div className="space-y-2">
                        <Label htmlFor="nextRemitoNumber">Próximo Número de Remito</Label>
                        <Input
                            id="nextRemitoNumber"
                            type="number"
                            value={nextRemitoNumber || ''}
                            onChange={(e) => setNextRemitoNumber(Number(e.target.value))}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="cai">C.A.I. (Código de Autorización de Impresión)</Label>
                        <Input
                            id="cai"
                            value={cai}
                            onChange={(e) => setCai(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Fecha de Vencimiento del C.A.I.</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !caiExpiration && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {caiExpiration ? format(caiExpiration, "PPP") : <span>Elige una fecha</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={caiExpiration}
                                    onSelect={setCaiExpiration}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isSaving ? 'Guardando...' : 'Guardar Configuración'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}


export default function AdminSettingsPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);

    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const isLoading = isUserLoading || isProfileLoading;

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    const isAdmin = userProfile?.role === 'Admin';

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-headline font-bold">Configuración General</h1>
                    <p className="text-muted-foreground">Ajustes globales de la aplicación.</p>
                </div>
            </div>
            {isAdmin ? (
                <AdminSettingsPageClient />
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Acceso Denegado</CardTitle>
                        <CardDescription>No tienes permisos para acceder a esta sección.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>Si crees que esto es un error, por favor contacta al administrador del sistema.</p>
                    </CardContent>
                </Card>
            )}
        </main>
    );
}

