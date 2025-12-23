import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import Nav from "../../Components/Nav/Nav";
import HomePage from "../Homepage/Homepage";

export default function Dashboard() {
  const [active, setActive] = useState("dashboard");
  const drawerWidth = 260;

  const renderPage = () => {
    switch (active) {
      case "dashboard":
        return <HomePage />;

      default:
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={800}>
              {active}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Coming soon.
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Nav active={active} onSelect={setActive} width={drawerWidth} />
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
        {renderPage()}
      </Box>
    </Box>
  );
}
