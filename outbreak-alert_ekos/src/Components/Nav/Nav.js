import React from "react";
import {  Avatar,Box,  Divider,Drawer,List,ListItemButton,ListItemText,Typography,Chip,} from "@mui/material";
import logo from "../../Images/EKOS_LOGO_SMALL.jpg";

export default function Nav({
  active = "dashboard",
  onSelect = () => {},
  logoSrc = logo,
  title = "Signals of Outbreak",
  subtitle = "Early Warning",
  width = 260,
  alertsCount = 3,
}) {
  const iconBoxSx = {
    width: 34,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 18,
    opacity: 0.85,
    flexShrink: 0,
  };

  const sections = [
    {
      label: "OVERVIEW",
      items: [
        { key: "dashboard", label: "Dashboard", icon: "▦" },
        {
          key: "alerts",
          label: "Alerts",
          icon: "🚨",
          right: alertsCount ? <Chip size="small" label={alertsCount} /> : null,
        },
      ],
    },
    {
      label: "ANALYSIS",
      items: [
        { key: "signals", label: "Signals", icon: "📈" },
        { key: "incidence", label: "Incidence Trends", icon: "🧪" },
        { key: "backtesting", label: "Backtesting", icon: "⏱" },
      ],
    },
    {
      label: "SYSTEM",
      items: [
        { key: "data-sources", label: "Data Sources", icon: "🗂" },
        { key: "model-thresholds", label: "Model & Thresholds", icon: "⚙️" },
        { key: "reports", label: "Reports", icon: "🧾", right: <Chip size="small" label="New" /> },
      ],
    },
    {
      label: "ADMIN",
      items: [
        { key: "settings", label: "Settings", icon: "🔧" },
        { key: "help", label: "Help", icon: "❓" },
      ],
    },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width,
          boxSizing: "border-box",
          borderRight: "1px solid",
          borderColor: "divider",
          position: "relative", 
        },
      }}
    >
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 2, py: 2 }}>
          <Avatar
            src={logoSrc}
            variant="rounded"
            sx={{ width: 44, height: 44 }}
            imgProps={{ style: { objectFit: "contain" } }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={900} noWrap>
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {subtitle}
            </Typography>
          </Box>
        </Box>

        <Divider />

        {/* Menu */}
        <Box sx={{ px: 1.25, py: 1, overflowY: "auto" }}>
          {sections.map((sec) => (
            <Box key={sec.label} sx={{ mb: 1.25 }}>
              <Typography
                variant="overline"
                sx={{ px: 1.25, color: "text.secondary", letterSpacing: 0.8 }}
              >
                {sec.label}
              </Typography>

              <List disablePadding>
                {sec.items.map((item) => (
                  <ListItemButton
                    key={item.key}
                    selected={active === item.key}
                    onClick={() => onSelect(item.key)}
                    sx={{
                      borderRadius: 2,
                      my: 0.25,
                      px: 1.25,
                      "&.Mui-selected": { bgcolor: "action.selected" },
                    }}
                  >
                    <Box sx={iconBoxSx}>{item.icon}</Box>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{ fontWeight: active === item.key ? 900 : 600 }}
                    />
                    {item.right ? <Box sx={{ ml: 1 }}>{item.right}</Box> : null}
                  </ListItemButton>
                ))}
              </List>
            </Box>
          ))}
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* Footer */}
        <Box sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary">
            EKOS • Early Warning System
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
}
