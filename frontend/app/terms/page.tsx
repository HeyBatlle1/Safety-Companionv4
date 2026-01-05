"use client";

import { motion } from "framer-motion";
import { FileText, CheckCircle, XCircle, AlertCircle, Scale, Users, DollarSign, Ban } from "lucide-react";

const sections = [
    {
        id: "acceptance",
        icon: CheckCircle,
        title: "Acceptance of Terms",
        content: "By accessing Safety Companion, you agree to these terms. If you don't agree, don't use the service. Simple as that."
    },
    {
        id: "service",
        icon: FileText,
        title: "Description of Service",
        content: "Safety Companion is a construction safety management platform that helps you:",
        items: [
            "Create and manage Job Hazard Analysis (JHA) forms",
            "Analyze safety risks using AI",
            "Generate Emergency Action Plans (EAP)",
            "Track site conditions and weather",
            "Manage your safety team and permissions"
        ]
    },
    {
        id: "accounts",
        icon: Users,
        title: "User Accounts",
        subsections: [
            {
                title: "Your Responsibilities",
                items: [
                    "You must be 18+ to use Safety Companion",
                    "Provide accurate registration information",
                    "Maintain the security of your account",
                    "Notify us immediately of unauthorized access",
                    "You're responsible for all activity under your account"
                ]
            },
            {
                title: "Account Types",
                items: [
                    "Master Admin: Full company control",
                    "Safety Director: Safety oversight",
                    "Project Manager: Team management",
                    "Foreman: Crew management",
                    "Field Worker: Read access + create JHAs"
                ]
            }
        ]
    },
    {
        id: "acceptable",
        icon: Scale,
        title: "Acceptable Use",
        subsections: [
            {
                title: "You MAY",
                items: [
                    "Use Safety Companion for workplace safety",
                    "Create JHAs for your projects",
                    "Upload photos of your job sites",
                    "Share data with your team",
                    "Export your data anytime"
                ],
                highlight: true
            },
            {
                title: "You MAY NOT",
                items: [
                    "Violate any laws or regulations",
                    "Upload malicious code or viruses",
                    "Attempt to breach security",
                    "Scrape or harvest data without permission",
                    "Resell or redistribute the service",
                    "Use it to spam or harass others",
                    "Submit false safety information"
                ],
                warning: true
            }
        ]
    },
    {
        id: "payments",
        icon: DollarSign,
        title: "Payments & Subscriptions",
        subsections: [
            {
                title: "Pricing",
                items: [
                    "Free Trial: 14 days, no credit card required",
                    "Pro Plan: $29/user/month (billed monthly)",
                    "Enterprise: Custom pricing for 50+ users",
                    "All prices in USD"
                ]
            },
            {
                title: "Billing",
                items: [
                    "Billed monthly or annually",
                    "Automatic renewal unless cancelled",
                    "Prorated charges for mid-cycle changes",
                    "Cancel anytime from your account",
                    "No refunds for partial months"
                ]
            },
            {
                title: "Payment Processing",
                items: [
                    "All payments processed by Stripe",
                    "We never store your credit card info",
                    "Failed payments = service suspension after 7 days",
                    "Past due accounts deleted after 30 days"
                ]
            }
        ]
    },
    {
        id: "termination",
        icon: Ban,
        title: "Termination",
        subsections: [
            {
                title: "You Can",
                items: [
                    "Cancel anytime from account settings",
                    "Export all your data before cancelling",
                    "Data deleted 7 days after cancellation",
                    "No questions asked"
                ]
            },
            {
                title: "We Can",
                items: [
                    "Suspend your account for non-payment",
                    "Terminate for Terms violation",
                    "Discontinue the service (with 90 days notice)",
                    "Refuse service to anyone"
                ]
            }
        ]
    },
    {
        id: "liability",
        icon: AlertCircle,
        title: "Limitation of Liability",
        content: "READ THIS CAREFULLY:",
        subsections: [
            {
                title: "Service Provided 'AS IS'",
                items: [
                    "We don't guarantee 100% uptime",
                    "AI suggestions are advisory, not definitive",
                    "You're responsible for final safety decisions",
                    "We're not liable for workplace accidents",
                    "Maximum liability limited to fees paid in last 12 months"
                ],
                warning: true
            },
            {
                title: "What We DO Guarantee",
                items: [
                    "99.9% uptime SLA (Enterprise plans)",
                    "Data backups and disaster recovery",
                    "Security best practices",
                    "Prompt bug fixes",
                    "Responsive customer support"
                ],
                highlight: true
            }
        ]
    },
    {
        id: "indemnity",
        icon: Scale,
        title: "Indemnification",
        content: "You agree to defend and indemnify Safety Companion against claims arising from:",
        items: [
            "Your use of the service",
            "Your violation of these terms",
            "Your violation of any law",
            "Workplace incidents (we're a tool, not a replacement for safety professionals)"
        ]
    },
    {
        id: "changes",
        icon: FileText,
        title: "Changes to Terms",
        content: "We may update these terms:",
        items: [
            "30 days advance notice for material changes",
            "Email notification to all users",
            "Continued use = acceptance",
            "You can export data and leave if you disagree"
        ]
    }
];

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Animated Background Grid */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

            {/* Hero Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 pt-24 pb-16 px-6"
            >
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="inline-block mb-6"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 blur-2xl opacity-50"></div>
                            <Scale className="w-20 h-20 text-amber-400 relative" strokeWidth={1.5} />
                        </div>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-6xl font-bold mb-4 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent"
                    >
                        Terms of Service
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-xl text-slate-400"
                    >
                        Last Updated: January 5, 2026
                    </motion.p>
                </div>
            </motion.div>

            {/* Content Sections */}
            <div className="relative z-10 max-w-4xl mx-auto px-6 pb-24">
                {sections.map((section, index) => (
                    <motion.div
                        key={section.id}
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ delay: index * 0.1 }}
                        className="mb-8"
                    >
                        <div className="group relative bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 hover:border-slate-700 transition-all duration-300 overflow-hidden">
                            {/* Gradient Border Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                            <div className="relative p-8">
                                {/* Section Header */}
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl">
                                        <section.icon className="w-6 h-6 text-amber-400" strokeWidth={2} />
                                    </div>
                                    <h2 className="text-3xl font-bold text-white">{section.title}</h2>
                                </div>

                                {/* Section Content */}
                                {section.content && (
                                    <p className="text-slate-300 text-lg mb-4 leading-relaxed">{section.content}</p>
                                )}

                                {/* Simple Items List */}
                                {section.items && (
                                    <ul className="space-y-3 mt-4">
                                        {section.items.map((item, itemIndex) => (
                                            <motion.li
                                                key={itemIndex}
                                                initial={{ opacity: 0 }}
                                                whileInView={{ opacity: 1 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: itemIndex * 0.03 }}
                                                className="flex items-start gap-3 text-slate-300"
                                            >
                                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"></span>
                                                <span>{item}</span>
                                            </motion.li>
                                        ))}
                                    </ul>
                                )}

                                {/* Subsections */}
                                {section.subsections && (
                                    <div className="space-y-6">
                                        {section.subsections.map((subsection, subIndex) => (
                                            <motion.div
                                                key={subIndex}
                                                initial={{ opacity: 0, x: -20 }}
                                                whileInView={{ opacity: 1, x: 0 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: subIndex * 0.05 }}
                                                className={`rounded-xl p-6 ${(subsection as any).highlight
                                                    ? "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30"
                                                    : (subsection as any).warning
                                                        ? "bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30"
                                                        : "bg-slate-800/30"
                                                    }`}
                                            >
                                                <h3 className="text-xl font-semibold text-white mb-4">{subsection.title}</h3>
                                                <ul className="space-y-3">
                                                    {subsection.items.map((item, itemIndex) => (
                                                        <motion.li
                                                            key={itemIndex}
                                                            initial={{ opacity: 0 }}
                                                            whileInView={{ opacity: 1 }}
                                                            viewport={{ once: true }}
                                                            transition={{ delay: itemIndex * 0.03 }}
                                                            className="flex items-start gap-3 text-slate-300"
                                                        >
                                                            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${(subsection as any).highlight
                                                                ? "bg-emerald-400"
                                                                : (subsection as any).warning
                                                                    ? "bg-red-400"
                                                                    : "bg-amber-400"
                                                                }`}></span>
                                                            <span>{item}</span>
                                                        </motion.li>
                                                    ))}
                                                </ul>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}

                {/* Footer Note */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="mt-16 p-8 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl"
                >
                    <div className="flex items-start gap-4">
                        <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                        <div className="text-slate-300">
                            <p className="font-semibold text-white mb-2">Plain English Version:</p>
                            <p className="text-sm leading-relaxed">
                                Use Safety Companion to keep your team safe. Don't be a jerk. Pay your bills. We'll do our best to keep the service running smoothly. If something goes wrong on a job site, that's on you - we're a tool, not your safety manager. Questions? Just ask us in plain English at <span className="text-amber-400">support@safety-companion.com</span>
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
