"use client";

import { useState, useEffect, useMemo } from "react";
import * as Lucide from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const getLucideIcons = () => {
  // Get all exported components from lucide-react
  // This approach is safe on Next.js since the import is dynamic.
  return Object.keys(Lucide).filter((key) => {
    // Filter out non-component exports like types, enums, etc.
    const isComponent =
      typeof Lucide[key as keyof typeof Lucide] === "function";
    return isComponent && key !== "createLucideIcon";
  });
};

export default function LucideIconViewer() {
  const [icons, setIcons] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIconName, setSelectedIconName] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    // Get the list of icon names on component mount
    setIcons(getLucideIcons());
  }, []);

  const handleIconClick = (iconName: string) => {
    setSelectedIconName(iconName);
    setIsCopied(false);
  };

  const handleCopy = () => {
    if (selectedIconName) {
      // Use the clipboard API to copy the icon name
      navigator.clipboard
        .writeText(selectedIconName)
        .then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000); // Reset copied state after 2 seconds
        })
        .catch((err) => {
          console.error("Failed to copy text: ", err);
        });
    }
  };

  const filteredIcons = useMemo(() => {
    return icons.filter((icon) =>
      icon.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [icons, searchTerm]);

  // Dynamically render the selected icon component
  const SelectedIconComponent = useMemo(() => {
    if (selectedIconName && Lucide[selectedIconName as keyof typeof Lucide]) {
      return Lucide[
        selectedIconName as keyof typeof Lucide
      ] as React.ComponentType<Lucide.LucideProps>;
    }
    return null;
  }, [selectedIconName]);

  return (
    <div className="p-8 flex flex-col items-center">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-center">Lucide Icon Viewer</CardTitle>
          <Separator />
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col md:flex-row gap-4 items-center">
            <Input
              type="text"
              placeholder="Search icons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            {selectedIconName && (
              <div className="flex flex-col items-center md:items-start gap-2">
                <span className="text-sm text-gray-500">Selected Icon:</span>
                <div className="flex items-center gap-2">
                  {SelectedIconComponent && <SelectedIconComponent size={24} />}
                  <span className="font-mono text-lg">{selectedIconName}</span>
                </div>
                <Button onClick={handleCopy} size="sm" variant="outline">
                  {isCopied ? "Copied!" : "Copy Name"}
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4 overflow-y-auto max-h-[600px] p-2 border rounded-lg">
            {filteredIcons.length > 0 ? (
              filteredIcons.map((iconName) => {
                const IconComponent = Lucide[
                  iconName as keyof typeof Lucide
                ] as React.ComponentType<Lucide.LucideProps>;
                return (
                  <div
                    key={iconName}
                    onClick={() => handleIconClick(iconName)}
                    className={`flex flex-col items-center p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                      selectedIconName === iconName
                        ? "bg-gray-200 dark:bg-gray-700"
                        : ""
                    }`}
                  >
                    <IconComponent size={24} className="mb-1" />
                    <span className="text-xs text-center break-words">
                      {iconName}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center text-gray-500">
                No icons found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
