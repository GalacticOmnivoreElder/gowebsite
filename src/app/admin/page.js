"use client";

import { observer } from "mobx-react";
import DashboardPage from "./dashboard/page";

const AdminPage = observer(() => {
  return <DashboardPage />;
});

export default AdminPage;
