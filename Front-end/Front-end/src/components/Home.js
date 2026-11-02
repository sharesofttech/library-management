import React from "react";
import UserLayout from "./user/UserLayout";
import BookCatalog from "./user/BookCatalog";

export default function Home() {
  return <UserLayout><BookCatalog /></UserLayout>;
}