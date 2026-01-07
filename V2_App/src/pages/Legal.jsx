import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, Lock } from 'lucide-react';
import logo from '../assets/logo.png';

export default function Legal() {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState('mentions');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        if (tab) setActiveTab(tab);
    }, [location]);

    const tabs = [
        { id: 'mentions', label: 'Mentions Légales', icon: FileText },
        { id: 'privacy', label: 'Confidentialité', icon: Lock },
        { id: 'cgu', label: 'CGU / CGV', icon: Shield },
    ];

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
            {/* Header */}
            <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center text-gray-500 hover:text-brand-purple transition-colors">
                        <ArrowLeft className="h-5 w-5 mr-2" />
                        Retour à l'accueil
                    </Link>
                    <div className="flex items-center gap-2 opacity-50">
                        <img src={logo} alt="Logo" className="h-6 w-auto" />
                        <span className="font-bold text-sm">Centre Juridique</span>
                    </div>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto px-4 py-12">
                <h1 className="text-3xl font-bold text-slate-900 mb-8">Informations Légales</h1>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-200 pb-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center px-4 py-2 rounded-t-lg font-medium transition-all ${
                                activeTab === tab.id
                                    ? 'bg-white text-brand-blue border border-gray-200 border-b-white -mb-[1px] shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            <tab.icon className="h-4 w-4 mr-2" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="bg-white p-8 rounded-b-xl rounded-tr-xl shadow-sm border border-gray-200 min-h-[500px] prose prose-slate max-w-none">
                    
                    {activeTab === 'mentions' && (
                        <div className="animate-fadeIn space-y-6">
                            <h2>Mentions Légales</h2>
                            
                            <section>
                                <h3>Éditeur du site</h3>
                                <p>
                                    <strong>Mediconvoi</strong><br/>
                                    255 B Avenue Marcel Castié, 83000 Toulon<br/>
                                    SIRET : [NUMÉRO SIRET]<br/>
                                    TVA applicable<br/>
                                    Responsable de la publication : le dirigeant de Mediconvoi.
                                </p>
                                <p>
                                    Contact : <a href="mailto:contact@mediconvoi.fr">contact@mediconvoi.fr</a>
                                </p>
                            </section>

                            <section>
                                <h3>Hébergeur</h3>
                                <p>
                                    Le site est hébergé sur une infrastructure Cloud sécurisée.<br/>
                                    <strong>O2 Switch</strong> (pour le déploiement final)<br/>
                                    Chemin des Pardiaux, 63000 Clermont-Ferrand
                                </p>
                            </section>

                            <section>
                                <h3>Activité et responsabilité</h3>
                                <p>
                                    Mediconvoi assure des prestations de logistique et de livraison pour les officines et professionnels de santé. Les informations présentées sur ce site ont un caractère informatif et peuvent être modifiées à tout moment.
                                </p>
                                <p>
                                    Malgré les mises à jour régulières, des erreurs ou omissions peuvent subsister. Mediconvoi ne saurait être tenu responsable d'un mauvais usage des informations publiées ni de dommages directs ou indirects résultant de l'accès au site.
                                </p>
                            </section>

                            <section>
                                <h3>Propriété intellectuelle</h3>
                                <p>
                                    L'ensemble des contenus, textes, visuels, logos et éléments graphiques présents sur ce site sont protégés par le droit d'auteur et les droits de propriété intellectuelle. Toute reproduction ou diffusion, totale ou partielle, sans autorisation écrite préalable est interdite.
                                </p>
                            </section>

                            <section>
                                <h3>Données personnelles</h3>
                                <p>
                                    Mediconvoi met en œuvre des traitements de données personnelles nécessaires à la gestion des réservations, à la facturation et au suivi client. Ces traitements sont décrits en détail dans l'onglet "Confidentialité".
                                </p>
                                <p>
                                    Pour toute demande relative à l'exercice de vos droits (accès, rectification, opposition, suppression, limitation ou portabilité), contactez <a href="mailto:contact@mediconvoi.fr">contact@mediconvoi.fr</a>.
                                </p>
                            </section>

                            <section>
                                <h3>Liens hypertextes</h3>
                                <p>
                                    Le site peut proposer des liens vers d'autres ressources externes. Mediconvoi décline toute responsabilité quant au contenu et au fonctionnement de ces sites tiers, sur lesquels il n'exerce aucun contrôle.
                                </p>
                            </section>

                            <section>
                                <h3>Signalement et contact</h3>
                                <p>
                                    Pour signaler un contenu illicite, une difficulté d'accès ou exercer vos droits, écrivez-nous à <a href="mailto:contact@mediconvoi.fr">contact@mediconvoi.fr</a>. Nous nous engageons à répondre dans les meilleurs délais.
                                </p>
                            </section>
                        </div>
                    )}

                    {activeTab === 'privacy' && (
                        <div className="animate-fadeIn space-y-6">
                            <h2>Informations & Confidentialité</h2>
                            <p>
                                Mediconvoi attache une importance constante à la protection des données personnelles de ses clients et partenaires professionnels. Les traitements décrits ci-dessous respectent le Règlement Général sur la Protection des Données (RGPD) et la loi Informatique et Libertés.
                            </p>

                            <section>
                                <h3>Responsable du traitement</h3>
                                <p>
                                    <strong>Mediconvoi</strong><br/>
                                    255 B Avenue Marcel Castié, 83000 Toulon<br/>
                                    Contact : <a href="mailto:contact@mediconvoi.fr">contact@mediconvoi.fr</a>
                                </p>
                                <p>
                                    Le responsable du traitement est le dirigeant de Mediconvoi, joignable à la même adresse e-mail pour toute question relative à la protection des données.
                                </p>
                            </section>

                            <section>
                                <h3>Données collectées</h3>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><strong>Données d'identification</strong> : raison sociale, prénom et nom du référent, SIRET, code postal, adresse professionnelle.</li>
                                    <li><strong>Coordonnées professionnelles</strong> : adresses e-mail, numéros de téléphone, informations de facturation.</li>
                                    <li><strong>Données opérationnelles</strong> : historique des réservations, instructions de livraison, informations nécessaires à la logistique.</li>
                                    <li><strong>Données de facturation</strong> : montants, délais de paiement, justificatifs et pièces jointes liées au dossier client.</li>
                                    <li><strong>Données techniques</strong> : journaux d'activité et traces de sécurité conservés dans un but d'audit et de sécurisation des accès.</li>
                                </ul>
                            </section>

                            <section>
                                <h3>Finalités et bases légales</h3>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><strong>Gestion des réservations et exécution des tournées</strong> (base légale : exécution du contrat et mesures précontractuelles).</li>
                                    <li><strong>Facturation, gestion comptable et obligations légales</strong> (base légale : obligation légale applicable aux transporteurs et prestataires logistiques).</li>
                                    <li><strong>Suivi de la relation client et assistance</strong> (base légale : intérêt légitime à assurer un service de qualité et assurer la traçabilité des échanges).</li>
                                    <li><strong>Sécurité du service et prévention de la fraude</strong> (base légale : intérêt légitime).</li>
                                    <li><strong>Communication d'informations contractuelles</strong> (base légale : obligation légale et exécution du contrat).</li>
                                </ul>
                            </section>

                            <section>
                                <h3>Destinataires des données</h3>
                                <p>
                                    Les données sont traitées exclusivement par les équipes internes habilitées de Mediconvoi et, le cas échéant, par ses partenaires logistiques tenus à une obligation contractuelle de confidentialité.
                                </p>
                                <p>
                                    Les outils utilisés pour assurer la prestation peuvent impliquer des transferts hors de l'Union Européenne (notamment dans le cadre de services Cloud sécurisés). Ces transferts sont couverts par les clauses contractuelles types approuvées par la Commission européenne.
                                </p>
                            </section>

                            <section>
                                <h3>Durées de conservation</h3>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><strong>Dossiers de facturation</strong> : conservés 5 ans conformément aux obligations légales.</li>
                                    <li><strong>Journaux techniques et traces de sécurité</strong> : conservés 12 mois pour assurer la sécurité et l'audit des accès.</li>
                                    <li><strong>Données opérationnelles</strong> : conservées pendant la relation contractuelle augmentée de la prescription légale applicable aux professionnels.</li>
                                    <li><strong>Pièces justificatives transmises par les clients</strong> : conservées pendant la durée strictement nécessaire au traitement de la demande puis archivées selon les obligations légales.</li>
                                </ul>
                            </section>

                            <section>
                                <h3>Vos droits</h3>
                                <p>Vous disposez, dans les conditions prévues par la réglementation, des droits suivants :</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>Droit d'accès et de rectification de vos données.</li>
                                    <li>Droit d'effacement, de limitation et d'opposition au traitement.</li>
                                    <li>Droit à la portabilité des données que vous avez fournies.</li>
                                    <li>Droit de définir des directives relatives au sort de vos données après votre décès.</li>
                                </ul>
                                <p className="mt-4">
                                    Pour exercer vos droits, écrivez à <a href="mailto:contact@mediconvoi.fr">contact@mediconvoi.fr</a> en précisant l'objet de votre demande et en joignant, le cas échéant, un justificatif d'identité. Une réponse vous sera apportée dans un délai maximum de 30 jours.
                                </p>
                                <p>
                                    Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL (<a href="https://www.cnil.fr/" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>).
                                </p>
                            </section>

                            <section>
                                <h3>Cookies et traceurs</h3>
                                <p>
                                    L'application n'utilise pas de cookies publicitaires ni de traceurs tiers. Seuls des cookies ou stockages techniques strictement nécessaires au fonctionnement du service (sécurisation de session, mémorisation ponctuelle des informations de réservation) peuvent être déposés sur votre navigateur.
                                </p>
                            </section>

                            <section>
                                <h3>Sécurité et hébergement</h3>
                                <p>
                                    Mediconvoi met en œuvre des mesures techniques et organisationnelles adaptées : accès restreints, journalisation, sauvegardes cryptées, séparation des environnements et purge automatique des données obsolètes.
                                </p>
                            </section>
                        </div>
                    )}

                    {activeTab === 'cgu' && (
                        <div className="animate-fadeIn space-y-6">
                            <h2>Conditions Générales d'Utilisation (CGU)</h2>
                            
                            <section>
                                <h3>1. Objet</h3>
                                <p>
                                    Les présentes CGU régissent l'utilisation des services de la plateforme Mediconvoi par les professionnels de santé (Pharmacies, EHPAD, Hôpitaux) et les particuliers.
                                </p>
                            </section>

                            <section>
                                <h3>2. Accès au service</h3>
                                <p>
                                    L'accès à la commande de courses nécessite la création d'un compte professionnel vérifié. Mediconvoi se réserve le droit de refuser l'accès à tout utilisateur ne respectant pas les critères de qualité exigés.
                                </p>
                            </section>

                            <section>
                                <h3>3. Responsabilités</h3>
                                <p>
                                    Mediconvoi s'engage à respecter les délais et les conditions de conservation (chaîne du froid) mais ne saurait être tenu responsable en cas de force majeure ou de défaut imputable à l'expéditeur (emballage défectueux, adresse erronée). L'utilisateur est responsable de l'exactitude des informations de livraison fournies.
                                </p>
                            </section>

                            <section>
                                <h3>4. Modification des conditions</h3>
                                <p>
                                    Mediconvoi se réserve le droit de modifier unilatéralement et à tout moment le contenu des présentes CGU.
                                </p>
                            </section>

                            <section>
                                <h3>5. Droit applicable</h3>
                                <p>
                                    Les présentes conditions générales sont soumises à l'application du droit français.
                                </p>
                            </section>
                        </div>
                    )}
                    
                </div>
            </div>
        </div>
    );
}
