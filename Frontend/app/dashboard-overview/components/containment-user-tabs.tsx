"use client";

import { useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { usersApi, userPhotoApi, User, UserRole } from "@/lib/api-service";
import { useSortableTable } from "@/hooks/use-sort-table";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { toast } from "sonner";
import Image from "next/image";

const ITEMS_PER_PAGE = 10;

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const { sorted } = useSortableTable(users);
  const { filteredData } = useSearchFilter(sorted, [
    "name",
    "email",
    "phoneNumber",
  ]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await usersApi.getUsers();
      if (result.success && result.data) {
        setUsers(result.data);
      } else {
        toast.error(result.message || "Failed to load users");
      }
    } catch (error: any) {
      toast.error(error.message || "Error loading users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const getUserPhotoUrl = (user: User) => {
    return userPhotoApi.getPhotoUrl(user);
  };

  return (
    <main className="p-2">
      {/* User List Cards */}
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="p-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Users</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 gap-4">
                {paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user) => (
                    <Card key={user.id} className="relative p-4 text-center">
                      <div className="flex justify-center items-center mb-2">
                        <div
                          className={`relative w-16 h-16 rounded-full overflow-hidden border-2 
                            ${
                              user.isActive
                                ? "border-green-500"
                                : "border-red-500"
                            }`}
                        >
                          <Image
                            src={getUserPhotoUrl(user)}
                            alt={user.name}
                            layout="fill"
                            objectFit="cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/images/avatar-user.png";
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col items-center">
                        <h2 className="text-sm font-bold truncate">
                          {user.name}
                        </h2>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full text-center py-4 text-sm text-muted-foreground">
                    No users found.
                  </div>
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            setCurrentPage((p) => Math.max(p - 1, 1))
                          }
                          className={
                            currentPage === 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink
                            isActive={currentPage === i + 1}
                            onClick={() => setCurrentPage(i + 1)}
                            className="cursor-pointer"
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setCurrentPage((p) => Math.min(p + 1, totalPages))
                          }
                          className={
                            currentPage === totalPages
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
