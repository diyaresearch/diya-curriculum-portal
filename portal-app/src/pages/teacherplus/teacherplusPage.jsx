import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useUserData from '@/hooks/useUserData';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';
import { COLLECTIONS } from '@/firebase/collectionNames';

import {
    MODULE_CONTENT_TYPES,
    MODULE_CATEGORIES,
    MODULE_LEVELS,
} from '@/constants/moduleConstants';

import laptopImg from '@/assets/laptop.png';
import Loading from "@/components/ui/Loading";

function normalizeBoolean(value) {
    if (value === true) return true;
    if (value === false) return false;
    if (value === 1) return true;
    if (value === 0) return false;
    const s = String(value || "").trim().toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
    return false;
}

function isModuleVisibleToViewer(moduleItem, viewerUser) {
    if (!moduleItem || moduleItem._type !== "Module") return true;
    if (moduleItem.isDraft === true) return false;
    const viewerUid = viewerUser?.uid || "";
    const authorUid = moduleItem.author || "";
    if (viewerUid && authorUid && viewerUid === authorUid) return true;
    return moduleItem.isPublic === true;
}

function capitalizeWords(str) {
    if (str === null || str === undefined) return 'N/A';
    const stringValue = String(str);
    return stringValue
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
}


const TeacherPlusPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, userData, loading } = useUserData();
    const displayName =
        userData?.fullName ||
        user?.displayName ||
        (user?.email ? user.email.split("@")[0] : "TeacherPlus User");

    const [userModules, setUserModules] = useState([]);
    const [contentType, setContentType] = useState("All");
    const [category, setCategory] = useState("All");
    const [level, setLevel] = useState("All");
    const [keyword, setKeyword] = useState("");

    const [modules, setModules] = useState([]);
    const [lessons, setLessons] = useState([]);
    const [nuggets, setNuggets] = useState([]);
    // What "Apply Filters" produced. Until then the list is derived, not stored:
    // an effect used to write the unfiltered set into the same state (#525).
    const [appliedItems, setAppliedItems] = useState([]);
    const [filtersApplied, setFiltersApplied] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(6);

    const [featuredPage, setFeaturedPage] = useState(1);
    const FEATURED_PAGE_SIZE = 3;

    useEffect(() => {
        const updateItemsPerPage = () => {
            const screenWidth = window.innerWidth;
            let itemsPerRow;
            if (screenWidth >= 1400) itemsPerRow = 3;
            else if (screenWidth >= 1000) itemsPerRow = 3;
            else if (screenWidth >= 800) itemsPerRow = 2;
            else itemsPerRow = 1;
            setItemsPerPage(itemsPerRow * 2);
        };
        updateItemsPerPage();
        window.addEventListener('resize', updateItemsPerPage);
        return () => window.removeEventListener('resize', updateItemsPerPage);
    }, []);

    // Replace your existing useEffect that fetches modules (around line 65) with this:

    useEffect(() => {
        if (!user) return; // Don't fetch if user is not logged in


        // Fetch all modules for the filter section
        getDocs(collection(db, COLLECTIONS.module)).then(snapshot => {
            const moduleData = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                moduleData.push({
                    id: doc.id,
                    title: data.title || "Untitled Module",
                    description: data.description || "",
                    image: data.image || "module1",
                    featuredImageUrl: data.featuredImageUrl || data.featuredImageURL || data.imageUrl || data.imageURL || "",
                    tags: data.tags || [],
                    level: data.level || "Basic",
                    category: data.category || "General",
                    lessonPlans: data.lessonPlans || {},
                    isDraft: data.isDraft || false,
                    isFeatured: data.isFeatured === true,
                    featuredOrder: Number.isFinite(Number(data.featuredOrder)) ? Number(data.featuredOrder) : 999,
                    isPublic: normalizeBoolean(data.isPublic),
                    author: data.author || data.authorId || "", // Add author field
                    _type: "Module"
                });
            });
            setModules(moduleData);

            // Filter modules created by current user (exclude drafts)
            const currentUserModules = moduleData.filter(module =>
                module.author === user.uid && !module.isDraft
            );
            setUserModules(currentUserModules);
        }).catch(error => {
            console.error("Error fetching modules:", error);
        });

        // Published lessons only - the rules require the constraint (#430), and
        // this dashboard already describes itself as showing what is published.
        getDocs(query(collection(db, COLLECTIONS.lesson), where("isPublic", "==", true))).then(snapshot => {
            setLessons(snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                isDraft: doc.data().isDraft || false,
                _type: "Lesson Plan"
            })));
        });

        getDocs(collection(db, COLLECTIONS.content)).then(snapshot => {
            setNuggets(snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                _type: "Nuggets"
            })));
        });
    }, [user]); // Add user as dependency

    // Everything published, which is what the dashboard shows before filtering.
    const defaultItems = useMemo(() => {
        const publishedModules = modules.filter(m => isModuleVisibleToViewer(m, user));
        const publishedLessons = lessons.filter(l => !l.isDraft);
        return [...publishedModules, ...publishedLessons, ...nuggets].filter(
            (item) => item?._type !== "Module" || isModuleVisibleToViewer(item, user)
        );
    }, [modules, lessons, nuggets, user]);

    const filteredItems = filtersApplied ? appliedItems : defaultItems;

    const featuredModules = (modules || [])
        .filter((m) => m?._type === "Module")
        .filter((m) => m?.isFeatured === true)
        .filter((m) => m?.isDraft !== true)
        .filter((m) => isModuleVisibleToViewer(m, user))
        .sort((a, b) => (a.featuredOrder || 999) - (b.featuredOrder || 999));

    const featuredTotalPages = Math.max(1, Math.ceil(featuredModules.length / FEATURED_PAGE_SIZE));
    const safeFeaturedPage = Math.min(Math.max(1, featuredPage), featuredTotalPages);
    const featuredStart = (safeFeaturedPage - 1) * FEATURED_PAGE_SIZE;
    const featuredItems = featuredModules.slice(featuredStart, featuredStart + FEATURED_PAGE_SIZE);

    // Back to page 1 whenever the list under a pager changes. Adjusting state
    // during render is React's documented alternative to an effect here (#525).
    const [pagedOver, setPagedOver] = useState({ modules, filteredItems, itemsPerPage });
    if (pagedOver.modules !== modules) {
        setPagedOver((prev) => ({ ...prev, modules }));
        setFeaturedPage(1);
    }
    if (pagedOver.filteredItems !== filteredItems || pagedOver.itemsPerPage !== itemsPerPage) {
        setPagedOver((prev) => ({ ...prev, filteredItems, itemsPerPage }));
        setCurrentPage(1);
    }

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    let paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);


    const handleApplyFilters = () => {
        let items = [];
        const publishedModules = modules.filter(m => isModuleVisibleToViewer(m, user));
        const publishedLessons = lessons.filter(l => !l.isDraft);

        if (contentType === "All") {
            items = [...publishedModules, ...publishedLessons, ...nuggets];
        } else if (contentType === "Module") {
            items = publishedModules;
        } else if (contentType === "Lesson Plan") {
            items = publishedLessons;
        } else if (contentType === "Nuggets") {
            items = nuggets;
        }

        if (category !== "All") {
            items = items.filter(item => {
                let cat = item.category || item.Category || "";
                if (Array.isArray(cat)) cat = cat.join(", ");
                return cat.toString().toLowerCase() === category.toLowerCase();
            });
        }

        if (level !== "All") {
            items = items.filter(item => {
                let lvl = item.level || item.Level || "";
                if (Array.isArray(lvl)) lvl = lvl.join(", ");
                return lvl.toString().toLowerCase() === level.toLowerCase();
            });
        }

        if (keyword.trim()) {
            const kw = keyword.trim().toLowerCase();
            items = items.filter(item =>
                (item.title || item.Title || "").toLowerCase().includes(kw)
            );
        }

        // Final safety: never leak private modules in any combined list (e.g. contentType "All").
        items = items.filter((item) => item?._type !== "Module" || isModuleVisibleToViewer(item, user));



        setAppliedItems(items);
        setFiltersApplied(true);
    };

    const handleResetFilters = () => {
        setContentType("All");
        setCategory("All");
        setLevel("All");
        setKeyword("");
        setAppliedItems([]);
        setFiltersApplied(false);
    };

    if (loading) {
        return <Loading variant="page" />;
    }

    return (
        <div
            className="w-full bg-surface-subtle flex flex-col items-center"
        >

            {/* Header Section for TeacherPlus */}
            <section
                className="w-full bg-navy-soft py-15 px-0 flex flex-row items-center justify-center gap-15 text-white"
            >
                <div className="flex-[1] max-w-125 pl-10">
                    <h1 className="text-page-title font-bold mb-4 text-white">
                        Welcome Back, {displayName}!
                    </h1>
                    <p className="text-[1.1rem] mb-8 text-surface-sunken">
                        Access advanced tools to enhance your teaching experience.
                    </p>
                    <button
                        onClick={() => navigate("/coming-soon?feature=Classroom%20Management")}
                        className="bg-[#fbbf24] text-[#1a202c] border-0 rounded-md py-3 px-8 text-[1rem] font-semibold cursor-pointer"
                    >
                        Manage My Classroom
                    </button>
                </div>
                <div className="flex-[1] max-w-100 h-75 rounded-lg mr-10">
                    <div className="flex-[1] max-w-100 h-75 rounded-lg mr-10 overflow-hidden">
                        <img
                            src={laptopImg}
                            alt="Teaching Tools"
                            className="w-full h-full object-cover block"
                        />
                    </div>
                </div>
            </section>

            {/* Create New Section */}
            <section
                className="w-full py-20 px-0 flex flex-col items-center"
            >
                <h2
                    className="text-page-title font-bold text-ink-strong text-center m-0 tracking-[1px]"
                >
                    Create New
                </h2>
                <p
                    className="mt-4.5 text-[1.15rem] text-ink text-center max-w-150 font-medium mb-15"
                >
                    Start creating your content now!
                </p>

                {/* Create New Tools */}
                <div
                    className="flex justify-center gap-10 w-full max-w-275 flex-wrap"
                >
                    {/* Create Module */}
                    <div
                        className="bg-surface rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] w-85 h-80 flex flex-col items-center justify-center cursor-pointer [transition:transform_0.2s,_box-shadow_0.2s] border-2 border-transparent"
                        onClick={() => navigate("/module-builder")}
                        onMouseEnter={(e) => {
                            e.target.style.transform = "translateY(-4px)";
                            e.target.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
                        }}
                    >
                        <div
                            className="w-20 h-20 bg-black rounded-full flex items-center justify-center mb-6"
                        >
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" strokeWidth="2" />
                                <path d="M9 9h6v6H9z" fill="white" />
                                <path d="M9 3v6M15 3v6M3 9h6M3 15h6" stroke="white" strokeWidth="2" />
                            </svg>
                        </div>
                        <h3
                            className="text-[1.5rem] font-bold text-ink mb-3 text-center"
                        >
                            Create Module
                        </h3>
                        <p
                            className="text-[1rem] text-ink-muted text-center max-w-70 leading-[1.5]"
                        >
                            Build a new module to teach.
                        </p>
                    </div>

                    {/* Create Lesson Plan */}
                    <div
                        className="bg-surface rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] w-85 h-80 flex flex-col items-center justify-center cursor-pointer [transition:transform_0.2s,_box-shadow_0.2s] border-2 border-transparent"
                        onClick={() => navigate("/lesson-plans/builder")}
                        onMouseEnter={(e) => {
                            e.target.style.transform = "translateY(-4px)";
                            e.target.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
                        }}
                    >
                        <div
                            className="w-20 h-20 bg-navy rounded-full flex items-center justify-center mb-6"
                        >
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="white" strokeWidth="2" />
                                <polyline points="14,2 14,8 20,8" stroke="white" strokeWidth="2" />
                                <line x1="16" y1="13" x2="8" y2="13" stroke="white" strokeWidth="2" />
                                <line x1="16" y1="17" x2="8" y2="17" stroke="white" strokeWidth="2" />
                                <polyline points="10,9 9,9 8,9" stroke="white" strokeWidth="2" />
                            </svg>
                        </div>
                        <h3
                            className="text-[1.5rem] font-bold text-ink mb-3 text-center"
                        >
                            Create Lesson Plan
                        </h3>
                        <p
                            className="text-[1rem] text-ink-muted text-center max-w-70 leading-[1.5]"
                        >
                            Design a lesson plan for your classes.
                        </p>
                    </div>

                    {/* Create Nugget */}
                    <div
                        className="bg-surface rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] w-85 h-80 flex flex-col items-center justify-center cursor-pointer [transition:transform_0.2s,_box-shadow_0.2s] border-2 border-transparent"
                        onClick={() => navigate("/nugget-builder")}
                        onMouseEnter={(e) => {
                            e.target.style.transform = "translateY(-4px)";
                            e.target.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
                        }}
                    >
                        <div
                            className="w-20 h-20 bg-[#fbbf24] rounded-full flex items-center justify-center mb-6"
                        >
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="2" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="white" strokeWidth="2" />
                            </svg>
                        </div>
                        <h3
                            className="text-[1.5rem] font-bold text-ink mb-3 text-center"
                        >
                            Create Nugget
                        </h3>
                        <p
                            className="text-[1rem] text-ink-muted text-center max-w-70 leading-[1.5]"
                        >
                            Share concise learning nuggets.
                        </p>
                    </div>
                </div>
            </section>


            {/* Featured Modules Section */}
            <section
                className="w-full pt-20 pr-0 pb-0 pl-0 flex flex-col items-center"
            >
                <h2
                    className="text-page-title font-bold text-ink-strong text-center m-0 tracking-[1px]"
                >
                    Featured Modules
                </h2>
                <p
                    className="mt-4.5 text-[1.15rem] text-ink text-center max-w-150 font-medium"
                >
                    Explore the latest modules available for your class.
                </p>

                <div
                    className="flex justify-center gap-10 mt-15 w-full max-w-275 py-0 px-4 box-border flex-wrap"
                >
                    {featuredModules.length === 0 ? (
                        <div className="p-10 text-center text-ink-muted text-[1.1rem] italic">
                            No featured modules yet.
                        </div>
                    ) : (
                        featuredItems.map((m) => (
                            <div
                                key={m.id}
                                className="bg-surface rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] w-85 h-85 flex flex-col items-center justify-end overflow-hidden cursor-pointer relative"
                                onClick={() => navigate(`/module/${m.id}`)}
                            >
                                <div className="w-full h-[calc(100%_-_70px)] flex items-stretch justify-center">
                                    <img
                                        src={String(m.featuredImageUrl || "").trim() ? m.featuredImageUrl : laptopImg}
                                        alt={m.title || "Module"}
                                        className="w-full h-full object-cover block"
                                    />
                                </div>
                                <div className="w-full h-22.5 pt-4.5 pr-0 pb-0 pl-0 text-center bg-surface">
                                    <span
                                        className="block font-semibold text-[1.15rem] text-navy tracking-[1px]"
                                    >
                                        {capitalizeWords(Array.isArray(m.level) ? m.level.join(", ") : m.level)}
                                    </span>
                                    <span
                                        className="block font-bold text-[1.35rem] text-ink mt-2 text-ellipsis whitespace-nowrap overflow-hidden py-0 px-2.5"
                                    >
                                        {m.title || "Untitled Module"}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {featuredModules.length > FEATURED_PAGE_SIZE && (
                    <div className="flex justify-center items-center gap-4.5 mt-7">
                        <button
                            type="button"
                            onClick={() => setFeaturedPage((p) => Math.max(1, p - 1))}
                            disabled={safeFeaturedPage === 1}
                            style={{
                                padding: "10px 18px",
                                borderRadius: 8,
                                border: "1px solid #bbb",
                                background: safeFeaturedPage === 1 ? "#eee" : "#fff",
                                color: "#222",
                                fontWeight: 700,
                                cursor: safeFeaturedPage === 1 ? "not-allowed" : "pointer",
                            }}
                        >
                            Prev
                        </button>
                        <div className="font-bold text-navy">
                            Page {safeFeaturedPage} of {featuredTotalPages}
                        </div>
                        <button
                            type="button"
                            onClick={() => setFeaturedPage((p) => Math.min(featuredTotalPages, p + 1))}
                            disabled={safeFeaturedPage === featuredTotalPages}
                            style={{
                                padding: "10px 18px",
                                borderRadius: 8,
                                border: "2px solid #162040",
                                background: "#162040",
                                color: "#fff",
                                fontWeight: 800,
                                cursor: safeFeaturedPage === featuredTotalPages ? "not-allowed" : "pointer",
                                opacity: safeFeaturedPage === featuredTotalPages ? 0.6 : 1,
                            }}
                        >
                            Next
                        </button>
                    </div>
                )}
            </section>

            {/* My Modules Section */}
            <section
                className="w-full py-20 px-0 flex flex-col items-center"
            >
                <h2
                    className="text-page-title font-bold text-ink-strong text-center m-0 tracking-[1px]"
                >
                    My Modules
                </h2>
                <p
                    className="mt-4.5 text-[1.15rem] text-ink text-center max-w-150 font-medium"
                >
                    Your custom teaching modules.
                </p>
                <button
                    onClick={() => navigate("/module-builder")}
                    className="mt-8 bg-black text-white border-0 rounded-md py-3 px-8 text-[1rem] font-semibold cursor-pointer"
                >
                    Add New Module
                </button>

                <div
                    className="flex justify-center gap-10 mt-15 w-full max-w-275 flex-wrap"
                >
                    {userModules.length === 0 ? (
                        <div className="p-10 text-center text-ink-muted text-[1.1rem] italic">
                            No custom modules created yet. Click "Add New Module" to get started!
                        </div>
                    ) : (
                        userModules.map((module) => (
                            <div
                                key={module.id}
                                className="bg-surface rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] w-85 h-85 flex flex-col items-center justify-end overflow-hidden cursor-pointer relative"
                                onClick={() => navigate(`/module/${module.id}`)}
                            >
                                <div className="w-full h-[calc(100%_-_70px)] flex items-stretch justify-center bg-[#f0f0f0]">
                                    <img
                                        src={laptopImg} // You can use module.image if you have custom images
                                        alt={module.title}
                                        className="w-full h-full object-cover block"
                                    />
                                </div>
                                <div className="w-full h-22.5 pt-4.5 pr-0 pb-0 pl-0 text-center bg-surface">
                                    <span
                                        className="block font-semibold text-[1.15rem] text-navy tracking-[1px]"
                                    >
                                        {capitalizeWords(Array.isArray(module.level) ? module.level.join(", ") : module.level)}
                                    </span>
                                    <span
                                        className="block font-bold text-[1.35rem] text-ink mt-2 text-ellipsis whitespace-nowrap overflow-hidden py-0 px-2.5"
                                    >
                                        {module.title}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Filter and Search Section */}
            <section
                className="w-full py-25 px-0 flex flex-col items-center"
            >
                <h2
                    className="text-page-title font-bold text-ink-strong text-center m-0 tracking-[1px]"
                >
                    Filter and Search
                </h2>
                {/* Keyword Filter */}
                <div className="mb-4.5 w-full max-w-100">
                    <input
                        type="text"
                        value={keyword || ""}
                        onChange={e => setKeyword(e.target.value)}
                        placeholder="Type a keyword to search..."
                        className="w-full py-2 px-4 rounded-md border border-[#bbb] text-[1rem] mt-2"
                    />
                </div>
                <div className="flex gap-8 flex-wrap mb-4.5">
                    {/* Content Type Filter */}
                    <div>
                        <label className="font-semibold text-navy mr-2">Content Type</label>
                        <select
                            value={contentType}
                            onChange={e => setContentType(e.target.value)}
                            className="py-2 px-4 rounded-md border border-[#bbb] text-[1rem]"
                        >
                            {["All", ...MODULE_CONTENT_TYPES].map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    {/* Category Filter */}
                    <div>
                        <label className="font-semibold text-navy mr-2">Category</label>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="py-2 px-4 rounded-md border border-[#bbb] text-[1rem]"
                        >
                            {MODULE_CATEGORIES.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    {/* Level Filter */}
                    <div>
                        <label className="font-semibold text-navy mr-2">Level</label>
                        <select
                            value={level}
                            onChange={e => setLevel(e.target.value)}
                            className="py-2 px-4 rounded-md border border-[#bbb] text-[1rem]"
                        >
                            {MODULE_LEVELS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                </div>

                {/* Filter Actions */}
                <div className="flex gap-4 mb-6">
                    <button
                        type="button"
                        onClick={handleResetFilters}
                        className="py-2 px-7 rounded-md border border-[#bbb] bg-surface text-ink font-semibold text-[1rem] cursor-pointer"
                    >
                        Reset Filters
                    </button>
                    <button
                        type="button"
                        onClick={handleApplyFilters}
                        className="py-2 px-7 rounded-md border-0 bg-navy text-white font-semibold text-[1rem] cursor-pointer"
                    >
                        Apply Filters
                    </button>
                </div>

                {/* Results Grid */}
                <div
                    className="w-full min-h-15 bg-surface-subtle rounded-lg [border:1px_dashed_#bbb] grid [grid-template-columns:repeat(3,_380px)] [grid-template-rows:repeat(2,_380px)] gap-10 p-10 justify-center items-start text-ink-faint text-body italic mb-4 box-border max-w-325 my-0 mx-auto"
                >
                    {paginatedItems.length === 0 ? (
                        <div className="[grid-column:1_/_-1] w-full text-center">
                            No modules found.
                        </div>
                    ) : (
                        paginatedItems.map((item) => (
                            <div
                                key={item.id}
                                className="bg-surface rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] w-95 h-95 flex flex-col items-center justify-end overflow-hidden cursor-pointer relative [transition:box-shadow_0.2s]"
                                onClick={() => {
                                    const returnTo = `${location.pathname}${location.search || ""}`;
                                    if (item._type === "Module") {
                                        navigate(`/module/${item.id}`, { state: { returnTo } });  // Changed from /modules/ to /module/
                                    } else if (item._type === "Lesson Plan") {
                                        navigate(`/lesson/${item.id}`, { state: { returnTo } });   // Changed from /lesson-plans/ to /lesson/
                                    } else if (item._type === "Nuggets") {
                                        navigate(`/content/${item.id}`, { state: { returnTo } });  // Changed from /nuggets/ to /content/
                                    }
                                }}
                            >

                                <div className="w-full h-[calc(100%_-_70px)] flex items-stretch justify-center bg-[#f0f0f0]">
                                    <img
                                        src={laptopImg}
                                        alt="Module"
                                        className="w-full h-full object-cover block"
                                    />
                                </div>
                                <div className="w-full h-25 pt-3 pr-0 pb-0 pl-0 text-center bg-surface">
                                    <span
                                        className="block font-bold text-[1.15rem] text-ink text-ellipsis whitespace-nowrap overflow-hidden"
                                    >
                                        {item.title || item.Title}
                                    </span>
                                    <span
                                        className="block font-semibold text-[1rem] text-navy tracking-[1px] mt-0.5"
                                    >
                                        {capitalizeWords(item.level || item.Level || "N/A")}
                                    </span>
                                    <span
                                        className="block font-semibold text-[1rem] text-navy tracking-[1px] mt-0.5"
                                    >
                                        {item._type}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination controls */}
                {totalPages > 1 && (
                    <div className="flex justify-center gap-6 mb-8">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            style={{
                                padding: "10px 28px",
                                borderRadius: 6,
                                border: "1px solid #bbb",
                                background: currentPage === 1 ? "#eee" : "#fff",
                                color: "#222",
                                fontWeight: "600",
                                fontSize: "1rem",
                                cursor: currentPage === 1 ? "not-allowed" : "pointer"
                            }}
                        >
                            Back
                        </button>
                        <span className="self-center font-semibold text-navy">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            style={{
                                padding: "10px 28px",
                                borderRadius: 6,
                                border: "1px solid #bbb",
                                background: currentPage === totalPages ? "#eee" : "#fff",
                                color: "#222",
                                fontWeight: "600",
                                fontSize: "1rem",
                                cursor: currentPage === totalPages ? "not-allowed" : "pointer"
                            }}
                        >
                            Next
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
};

export default TeacherPlusPage;