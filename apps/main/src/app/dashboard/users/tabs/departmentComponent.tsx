"use client";

import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader, MoreVertical, Edit, Trash2, CircleCheck } from "lucide-react";
import { useApiMutation, useApiQuery, useStatusMutation } from "@/hooks/useApi";
import { HTTP_METHODS } from "@/api/methods";
import { API_ENDPOINTS } from "@/api/endpoints";
import { EmptyState } from "@/components/not-found";
import { PermissionGuard, useModulePermissions } from "@/components/PermissionGuard";
import { ConfirmationModal } from "@/components/models/confirmationModal";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "../pagination";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface DepartmentComponentProps {
  searchTerm?: string;
  createSignal?: number;
  refreshSignal?: number;
}

export const DepartmentComponent: React.FC<DepartmentComponentProps> = ({
  searchTerm = "",
  createSignal = 0,
  refreshSignal = 0,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [modalState, setModalState] = useState<{
    action: "delete" | "status" | null;
    dept: any | null;
  }>({ action: null, dept: null });
  const [loading, setLoading] = useState(false);
  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [isFormDrawerOpen, setIsFormDrawerOpen] = useState(false);
  const [start, setStart] = useState(1);
  const [limit, setLimit] = useState(10);
  const previousCreateSignal = useRef(createSignal);
  const previousRefreshSignal = useRef(refreshSignal);
  const openModal = (action: "delete" | "status", dept: any) => {
    setModalState({ action, dept });
  };
  const openEdit = (dept: any) => {
    setName(dept.name);
    setDescription(dept.description || "");
    setEditingDept(dept);
    setIsFormDrawerOpen(true);
  };

  const handleCreateDepartment = () => {
    setEditingDept(null);
    setName("");
    setDescription("");
    setIsFormDrawerOpen(true);
  };

  const handleCloseFormDrawer = () => {
    if (loading) return;
    setIsFormDrawerOpen(false);
    setEditingDept(null);
    setName("");
    setDescription("");
  };
  const createDepartment = useApiMutation(
    HTTP_METHODS.POST,
    API_ENDPOINTS.DEPARTMENT,
  );
  const updateStatus = useStatusMutation(
    HTTP_METHODS.PUT,
    ({ id }) => `${API_ENDPOINTS.DEPARTMENT}/${id}/status`,
  );
  const deleteJobTitle = useStatusMutation(
    HTTP_METHODS.DELETE,
    (id) => `${API_ENDPOINTS.DEPARTMENT}/${id}`,
  );
  const updateDepartment = useStatusMutation(
    HTTP_METHODS.PUT,
    ({ id }) => `${API_ENDPOINTS.DEPARTMENT}/${id}`,
  );
  
  const { create: canCreate } = useModulePermissions(7);

  const queryParams = new URLSearchParams({
    start: String(start),
    limit: String(limit),
    ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
  }).toString();

  const { data, isLoading, isFetching, refetch } = useApiQuery(
    ["Department", start, limit, searchTerm],
    `${API_ENDPOINTS.DEPARTMENT}?${queryParams}`,
    { refetchOnWindowFocus: false, retry: 1 } as const,
  );

  useEffect(() => {
    if (createSignal === previousCreateSignal.current) return;
    previousCreateSignal.current = createSignal;
    if (createSignal <= 0) return;
    setEditingDept(null);
    setName("");
    setDescription("");
    setIsFormDrawerOpen(true);
  }, [createSignal]);

  useEffect(() => {
    if (refreshSignal === previousRefreshSignal.current) return;
    previousRefreshSignal.current = refreshSignal;
    if (refreshSignal <= 0) return;
    refetch();
  }, [refreshSignal, refetch]);

  useEffect(() => {
    setStart(1);
  }, [searchTerm]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    setLoading(true);

    if (editingDept) {
      const payload: any = { id: editingDept.id, name };
      if (description?.trim()) payload.description = description;
      updateDepartment.mutate(payload, {
        onSuccess: () => {
          setName("");
          setDescription("");
          setEditingDept(null);
          setIsFormDrawerOpen(false);
          refetch();
          setLoading(false);
        },
        onError: (err: any) => {
          console.error("Failed to update department:", err);
          setLoading(false);
        },
      });
    } else {
      // Create new department
      createDepartment.mutate(
        { name, description },
        {
          onSuccess: () => {
            setName("");
            setDescription("");
            setIsFormDrawerOpen(false);
            refetch();
            setLoading(false);
          },
          onError: (err) => {
            console.error("Failed to create department:", err);
            setLoading(false);
          },
        },
      );
    }
  };

  const handleConfirm = () => {
    if (!modalState.dept || !modalState.action) return;
    const { action, dept } = modalState;
    if (action === "delete") {
      setLoading(true);
      deleteJobTitle.mutate(dept.id, {
        onSuccess: () => {
          refetch();
          setModalState({ action: null, dept: null });
          setLoading(false);
        },
        onError: (err) => {
          setLoading(false);
        },
      });
    } else if (action === "status") {
      setLoading(true);

      updateStatus.mutate(
        { id: dept.id, status: !dept.status },
        {
          onSuccess: () => {
            refetch();
            setModalState({ action: null, dept: null });
            setLoading(false);
          },
          onError: (err: any) => {
            setLoading(false);
            console.error(err);
          },
        },
      );
    }
  };
  const departments = data?.data?.departments || [];
  const pagination = data?.data?.pagination || [];

  const skeletonRows = Array.from({ length: 5 });
  const hasSearch = searchTerm.trim().length > 0;

  return (
    <div className="space-y-3">
      <div className="w-full">
        {!isLoading && departments.length === 0 && hasSearch ? (
          <div className="flex justify-center items-center py-12">
            <EmptyState
              onClick={handleCreateDepartment}
              buttonTitle=""
              title="No results found"
              description="Please refine your search and try again."
            />
          </div>
        ) : !isLoading && departments.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <EmptyState
              onClick={handleCreateDepartment}
              buttonTitle={canCreate ? "Create Department" : ""}
              title="No Departmnet Created Yet"
              description="You haven't added any departmnet to your system. Add your first departmnet."
            />
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>

              {isLoading || isFetching ? (
                <TableBody>
                  {skeletonRows.map((_, idx) => (
                    <TableRow key={idx} className="animate-pulse">
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              ) : (
                <TableBody>
                  {departments.map((dept: any) => (
                    <TableRow key={dept.id} className="hover:bg-gray-50">
                      <TableCell>{dept.name}</TableCell>
                      <TableCell>{dept.description || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={dept.status ? "active" : "disabled"}>
                          {dept.status ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(dept.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="p-1">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <PermissionGuard moduleId={7} action="update">
                              <DropdownMenuItem
                                onClick={() => openEdit(dept)}
                                className="flex items-center gap-2"
                              >
                                <Edit className="w-4 h-4 text-primary" />
                                Edit
                              </DropdownMenuItem>
                            </PermissionGuard>
                            <PermissionGuard moduleId={7} action="update">
                              <DropdownMenuItem
                                onClick={() => openModal("status", dept)}
                                className="flex items-center gap-2"
                              >
                                <CircleCheck className="w-4 h-4 text-primary" />
                                {dept.status ? "Disable" : "Active"}
                              </DropdownMenuItem>
                            </PermissionGuard>
                            <PermissionGuard moduleId={7} action="delete">
                              <DropdownMenuItem
                                onClick={() => openModal("delete", dept)}
                                className="text-destructive flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                                Delete
                              </DropdownMenuItem>
                            </PermissionGuard>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              )}
            </Table>
            <div className="items-center border-t px-4 pb-4">
              <Pagination
                start={start}
                limit={limit}
                total={departments?.length || 0}
                pagination={pagination}
                onPageChange={(newStart) => setStart(newStart)}
                onLimitChange={(newLimit) => {
                  setLimit(newLimit);
                  setStart(1);
                }}
              />
            </div>
          </div>
        )}
      </div>

      <Sheet
        open={isFormDrawerOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsFormDrawerOpen(true);
            return;
          }
          handleCloseFormDrawer();
        }}
      >
        <SheetContent side="right" className="w-[96vw] gap-0 p-0 sm:max-w-lg">
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b px-6 py-4">
              <SheetTitle>{editingDept ? "Edit Department" : "Create Department"}</SheetTitle>
              <SheetDescription>
                {editingDept
                  ? "Update the selected department information."
                  : "Add a new department to the system."}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="rounded-xl border bg-white p-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      type="text"
                      placeholder="Enter Department"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      type="text"
                      placeholder="Enter Description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t px-6 py-4">
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseFormDrawer}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !name.trim()}
                >
                  {loading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                  {editingDept ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {modalState.dept && (
        <ConfirmationModal
          open={!!modalState.dept}
          title={
            modalState.action === "delete"
              ? "Delete Departmnet?"
              : "Change Status?"
          }
          description={
            modalState.action === "delete"
              ? `Are you sure you want to delete "${modalState.dept.name}"?`
              : `Are you sure you want to ${modalState.dept.status ? "disable" : "enable"} "${modalState.dept.name}"?`
          }
          confirmText={modalState.action === "delete" ? "Delete" : "Confirm"}
          onCancel={() => setModalState({ action: null, dept: null })}
          onConfirm={handleConfirm}
          loading={loading}
        />
      )}
    </div>
  );
};
