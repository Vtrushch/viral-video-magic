import { Outlet } from "react-router-dom";
import DashboardSidebar from "./DashboardSidebar";

const DashboardLayout = () => {
  return (
    <div className="min-h-screen flex w-full dark overflow-x-hidden">
      <DashboardSidebar />
      <main className="flex-1 overflow-x-hidden overflow-y-auto min-w-0">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
