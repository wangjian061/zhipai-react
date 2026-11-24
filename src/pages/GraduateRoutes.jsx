import React, { useSyncExternalStore } from "react";
import GraduatePrintPage from "./GraduatePrintPage.jsx";
import UniversityCollectionPage from "./UniversityCollectionPage.jsx";

function subscribeRoute(listener) {
  window.addEventListener("popstate", listener);
  window.addEventListener("zhipai-route", listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener("zhipai-route", listener);
  };
}
const currentRoute = () => location.pathname + location.search;

export default function GraduateRoutes() {
  const route = useSyncExternalStore(subscribeRoute, currentRoute, () => "");
  const search = new URLSearchParams(route.split("?")[1]);
  const page = search.get("page");
  const view = search.get("view");
  if (page === "collection" && view === "university") return <UniversityCollectionPage route={route} />;
  if (page === "print" && view === "graduate") return <GraduatePrintPage />;
  return null;
}
