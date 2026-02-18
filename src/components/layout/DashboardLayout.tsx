import { Outlet } from "react-router-dom";
import DashboardSidebar from "./DashboardSidebar";

const DashboardLayout = () => {
  return (
    <div className="h-screen flex w-full dark overflow-hidden">
      <DashboardSidebar />
      <main
        className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 pb-16 md:pb-0"
        style={{ maxWidth: "calc(100vw - var(--sidebar-width, 0px))", background: "#0F0F1A" }}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
