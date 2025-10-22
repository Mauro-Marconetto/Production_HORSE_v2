
'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { doc, collection } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import type { Remito, Supplier, Piece, RemitoSettings } from '@/lib/types';
import { Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export default function RemitoPage() {
    const { id: remitoId } = useParams();
    const firestore = useFirestore();

    const remitoRef = useMemoFirebase(() => 
        firestore && remitoId ? doc(firestore, 'remitos', remitoId as string) : null, 
    [firestore, remitoId]);
    const { data: remito, isLoading: isLoadingRemito } = useDoc<Remito>(remitoRef);

    const supplierId = remito?.supplierId;
    const supplierRef = useMemoFirebase(() => 
        firestore && supplierId ? doc(firestore, 'suppliers', supplierId) : null,
    [firestore, supplierId]);
    const { data: supplier, isLoading: isLoadingSupplier } = useDoc<Supplier>(supplierRef);
    
    const piecesRef = useMemoFirebase(() => firestore ? collection(firestore, 'pieces') : null, [firestore]);
    const { data: pieces, isLoading: isLoadingPieces } = useCollection<Piece>(piecesRef);

    const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'remitos') : null, [firestore]);
    const { data: settings, isLoading: isLoadingSettings } = useDoc<RemitoSettings>(settingsRef);

    const getPieceCode = (pieceId: string) => pieces?.find(p => p.id === pieceId)?.codigo || 'N/A';

    const isLoading = isLoadingRemito || isLoadingSupplier || isLoadingPieces || isLoadingSettings;

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white">
                <Loader2 className="h-12 w-12 animate-spin text-gray-700" />
            </div>
        );
    }

    if (!remito) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white text-gray-700">
                <p>Remito no encontrado.</p>
            </div>
        );
    }
    
    const remitoNumber = remito.numero?.toString().padStart(8, '0') || remito.id.slice(-8).toUpperCase();

    return (
        <div className="min-h-screen bg-white text-black p-4 sm:p-8 print:p-0">
             <div className="max-w-4xl mx-auto bg-white p-4 sm:p-8 border border-gray-300 rounded-md print:border-none print:shadow-none">
                <header className="flex justify-between items-start pb-4 border-b border-gray-300">
                    <div className="flex flex-col">
                        <Image src="/logo.png" alt="ForgeFlow Logo" width={200} height={40} className="mb-4"/>
                        <div className="text-xs">
                            <p className="font-bold">HORSE S.A.</p>
                            <p>Parque Industrial</p>
                            <p>Rafaela (S2300), Santa Fe, Argentina</p>
                            <p>Tel: +54 3492 440315</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h1 className="text-3xl font-bold">REMITO</h1>
                        <p className="text-sm">N°: <span className="font-mono">{remitoNumber}</span></p>
                        <p className="text-sm">Fecha: <span className="font-mono">{new Date(remito.fecha).toLocaleDateString('es-AR')}</span></p>
                        <div className="mt-4 text-xs">
                            <p>CUIT: 30-70828551-3</p>
                            <p>Ing. Brutos: 20-70828551-0</p>
                            <p>Inicio Actividades: 05/2003</p>
                        </div>
                    </div>
                </header>

                <section className="grid grid-cols-2 gap-4 my-4 pb-4 border-b border-gray-300 text-sm">
                    <div>
                        <h2 className="font-bold mb-1">Destinatario:</h2>
                        <p className="font-semibold">{supplier?.nombre}</p>
                        <p>{supplier?.direccion}</p>
                        <p>CUIT: {supplier?.cuit}</p>
                    </div>
                     <div>
                        <h2 className="font-bold mb-1">Transporte:</h2>
                        <p><span className="font-semibold">Razón Social:</span> {remito.transportista}</p>
                        <p><span className="font-semibold">Vehículo:</span> {remito.vehiculo}</p>
                    </div>
                </section>

                <section className="my-4">
                    <table className="w-full text-sm">
                        <thead className="border-b border-gray-400">
                            <tr className="text-left">
                                <th className="p-2 w-1/4">Código</th>
                                <th className="p-2 w-1/2">Descripción</th>
                                <th className="p-2 w-1/4 text-right">Cantidad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {remito.items.map((item, index) => {
                                const piece = pieces?.find(p => p.id === item.pieceId);
                                return (
                                <tr key={index} className="border-b border-gray-200">
                                    <td className="p-2 font-mono">{piece?.codigo || 'N/A'}</td>
                                    <td className="p-2">{piece ? `Pieza ${piece.codigo}` : ''}</td>
                                    <td className="p-2 text-right font-mono">{item.qty.toLocaleString('es-AR')}</td>
                                </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </section>

                 <footer className="mt-12 pt-8 text-xs text-gray-600">
                     <div className="grid grid-cols-2 gap-8">
                         <div className="flex flex-col justify-between">
                            <p>DUPLICADO</p>
                            <div className="pt-12">
                                 <div className="border-t border-gray-400 pt-1">Firma del transportista</div>
                            </div>
                         </div>
                         <div className="flex flex-col justify-between">
                             <div>
                                <p>Documento no válido como factura.</p>
                                {settings && (
                                    <div className="mt-4">
                                        <p>C.A.I. N°: {settings.cai}</p>
                                        <p>Fecha Vencimiento: {new Date(settings.caiExpiration).toLocaleDateString('es-AR')}</p>
                                    </div>
                                )}
                             </div>
                             <div className="pt-12">
                                <div className="border-t border-gray-400 pt-1">Firma del receptor</div>
                            </div>
                         </div>
                     </div>
                </footer>
             </div>
             <div className="max-w-4xl mx-auto mt-4 flex justify-end print:hidden">
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4"/>
                    Imprimir Remito
                </Button>
            </div>
        </div>
    )
}
