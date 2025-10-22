
'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { doc, collection } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import type { Remito, Supplier, Piece, RemitoSettings } from '@/lib/types';
import { Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

const RemitoCopy = ({ remito, supplier, pieces, settings, copyType }: { remito: Remito, supplier: Supplier | null, pieces: Piece[] | null, settings: RemitoSettings | null, copyType: 'ORIGINAL' | 'DUPLICADO' | 'TRIPLICADO' }) => {
    const remitoNumberString = remito.numero ? remito.numero.toString().padStart(8, '0') : 'N/A';
    const remitoNumber = `0008-${remitoNumberString}`;
    const getPieceCode = (pieceId: string) => pieces?.find(p => p.id === pieceId)?.codigo || 'N/A';
    const remitoDate = new Date(remito.fecha).toLocaleDateString('es-AR');

    return (
        <div className="max-w-4xl mx-auto bg-white p-4 sm:p-8 border border-gray-300 rounded-md print:border-none print:shadow-none flex flex-col h-[1056px] print:break-after-page">
            <header className="grid grid-cols-3 gap-4 pb-4 border-b border-gray-300">
                <div className="flex flex-col">
                    <Image src="/logo.png" alt="ForgeFlow Logo" width={200} height={40} className="mb-4"/>
                    <div className="text-xs">
                        <p className="font-bold">HORSE ARGENTINA S.A.</p>
                        <p>Parque Industrial</p>
                        <p>Rafaela (S2300), Santa Fe, Argentina</p>
                        <p>Tel: +54 3492 440315</p>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-start pt-4">
                        <div className="flex items-center justify-center h-16 w-16 border-2 border-black">
                        <span className="text-5xl font-bold">R</span>
                    </div>
                </div>
                <div className="text-right">
                    <h1 className="text-xl font-bold">REMITO</h1>
                    <p className="text-sm">N°: <span className="font-mono">{remitoNumber}</span></p>
                    <p className="text-sm">Fecha: <span className="font-mono">{remitoDate}</span></p>
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
                    <h2 className="font-bold mb-1">Transportista:</h2>
                    <p><span className="font-semibold">{remito.transportista}</span></p>
                    <p>{remito.vehiculo}</p>
                    {remito.transportistaCuit && <p>C.U.I.T.: {remito.transportistaCuit}</p>}
                </div>
            </section>

            <section className="my-4 flex-grow">
                <table className="w-full text-sm">
                    <thead className="border-b border-gray-400">
                        <tr className="text-left">
                            <th className="p-2 w-1/4">Código</th>
                            <th className="p-2 w-1/2">Descripción</th>
                            <th className="p-2 w-1/4 text-right">Cantidad</th>
                        </tr>
                    </thead>
                    <tbody className="min-h-[500px]">
                        {remito.items.map((item, index) => {
                            const piece = pieces?.find(p => p.id === item.pieceId);
                            return (
                            <tr key={index} className="border-b border-gray-200 align-top">
                                <td className="p-2 font-mono">{piece?.codigo || 'N/A'}</td>
                                <td className="p-2">{piece ? `Pieza ${piece.codigo}` : ''}</td>
                                <td className="p-2 text-right font-mono">{item.qty.toLocaleString('es-AR')}</td>
                            </tr>
                            )
                        })}
                    </tbody>
                </table>
            </section>

                <footer className="mt-auto pt-4 text-xs">
                <div className="border-t border-gray-400 pt-2 text-center">
                    <p><span className="font-bold">IMPORTANTE:</span> CUALQUIER RECLAMO POR CANTIDAD, DETERIORO, ETC. DEBERA HACERSE EN FORMA INMEDIATA AL TRANSPORTISTA O A MAS TARDAR DENTRO DE LAS 24 HS. DE RECIBIDA LA MERCADERIA</p>
                </div>
                <div className="mt-2 border-2 border-black grid grid-cols-4">
                    {/* Headers */}
                    <div className="border-r border-black text-center font-bold p-1">AUTORIZADO POR</div>
                    <div className="border-r border-black text-center font-bold p-1">DESPACHADO POR</div>
                    <div className="border-r border-black text-center font-bold p-1">CONTROL PROTECCION PLANTA</div>
                    <div className="text-center font-bold p-1">RECIBO AUTORIZADO</div>

                    {/* First row of content */}
                    <div className="border-t border-r border-black h-20 flex justify-center items-center">
                       <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" className="h-16 w-32">
                        <path d="M 6.33,118.59 C 21.99,66.86 42.48,51.81 57.06,44.91 C 70.08,38.67 87.21,39.69 100.99,49.19 C 117.38,60.42 121.78,79.80 120.37,97.77 C 118.82,117.65 113.63,131.76 102.66,134.11 C 94.20,135.91 87.05,131.54 81.65,125.04 C 64.08,103.55 60.18,92.54 57.51,75.47 C 54.19,54.10 65.57,36.56 81.08,24.89 C 96.06,13.62 114.93,10.02 132.84,15.22 C 160.77,23.36 181.82,47.28 194.20,74.52 C 205.15,98.98 206.59,124.93 200.28,149.73 C 219.00,123.00 223.00,100.00 250.00,80.00 C 260.00,73.00 275.00,73.00 285.00,83.00 C 295.00,93.00 297.00,105.00 293.00,115.00 C 310.58,95.53 315.65,77.79 328.76,64.68 C 341.62,51.82 359.39,45.86 376.62,49.19 C 391.89,52.11 400.00,65.00 400.00,65.00" fill="none" stroke="#000000" strokeWidth="2"/>
                       </svg>
                    </div>
                    <div className="border-t border-r border-black grid grid-cols-2">
                        <div className="border-r border-black p-1">LEGAJO</div>
                        <div className="p-1">FIRMA</div>
                    </div>
                    <div className="border-t border-r border-black grid grid-cols-2">
                        <div className="border-r border-black p-1">LEGAJO</div>
                        <div className="p-1">FIRMA</div>
                    </div>
                    <div className="border-t border-black grid grid-cols-2">
                        <div className="border-r border-black p-1">DOC.ID.</div>
                        <div className="p-1">FIRMA</div>
                    </div>
                    
                    {/* Second row of content */}
                    <div className="border-t border-r border-black grid grid-cols-2 h-20">
                        <div className="border-r border-black p-1 text-xs items-center flex">CAMBI, Luciano Oscar</div>
                        <div className="p-1 items-center flex">{remitoDate}</div>
                    </div>
                    <div className="border-t border-r border-black grid grid-cols-2">
                        <div className="border-r border-black p-1">FECHA</div>
                        <div className="p-1">ACLARACION</div>
                    </div>
                    <div className="border-t border-r border-black grid grid-cols-2">
                        <div className="border-r border-black p-1">FECHA</div>
                        <div className="p-1">ACLARACION</div>
                    </div>
                    <div className="border-t border-black grid grid-cols-2">
                        <div className="border-r border-black p-1">FECHA</div>
                        <div className="p-1">ACLARACION</div>
                    </div>
                </div>
                <div className="flex justify-between mt-1">
                    <div>
                        <span className="font-bold">F-66-1</span>
                        <span className="ml-4 font-bold">{copyType}</span>
                    </div>
                    {settings && (
                        <div className="text-right">
                            <p>C.A.I. N°: {settings.cai}</p>
                            <p>Fecha Vencimiento: {new Date(settings.caiExpiration).toLocaleDateString('es-AR')}</p>
                        </div>
                    )}
                </div>
            </footer>
        </div>
    );
}


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

    return (
        <div className="min-h-screen bg-gray-100 text-black p-4 sm:p-8 print:bg-white print:p-0">
             <div className="space-y-8 print:space-y-0">
                <RemitoCopy remito={remito} supplier={supplier} pieces={pieces} settings={settings} copyType="ORIGINAL" />
                <RemitoCopy remito={remito} supplier={supplier} pieces={pieces} settings={settings} copyType="DUPLICADO" />
                <RemitoCopy remito={remito} supplier={supplier} pieces={pieces} settings={settings} copyType="TRIPLICADO" />
             </div>
             <div className="max-w-4xl mx-auto mt-4 flex justify-end print:hidden">
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4"/>
                    Imprimir Remito (x3)
                </Button>
            </div>
        </div>
    )
}
