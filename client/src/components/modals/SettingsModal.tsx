import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/layout/ThemeProvider";
import { User } from "@/lib/auth";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  onSignOut: () => void;
}

export function SettingsModal({ open, onOpenChange, user, onSignOut }: SettingsModalProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="modal-settings">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Theme Settings */}
          <div>
            <h3 className="text-sm font-medium mb-3">Appearance</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm">Dark Mode</span>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={toggleTheme}
                data-testid="switch-dark-mode"
              />
            </div>
          </div>

          {/* Account Settings */}
          <div>
            <h3 className="text-sm font-medium mb-3">Account</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm" data-testid="settings-user-email">
                  {user?.email || "Loading..."}
                </span>
              </div>
            </div>
          </div>

          {/* Data & Privacy */}
          <div>
            <h3 className="text-sm font-medium mb-3">Data & Privacy</h3>
            <div className="space-y-3">
              <Button
                variant="ghost"
                className="w-full justify-start p-0 h-auto text-sm"
                data-testid="button-export-conversations"
              >
                Export Conversations
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start p-0 h-auto text-sm"
                data-testid="button-privacy-policy"
              >
                Privacy Policy
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start p-0 h-auto text-sm"
                data-testid="button-terms-of-service"
              >
                Terms of Service
              </Button>
            </div>
          </div>
        </div>

        {/* Sign Out Button */}
        <div className="mt-8 pt-6 border-t">
          <Button
            variant="destructive"
            className="w-full"
            onClick={onSignOut}
            data-testid="button-sign-out-modal"
          >
            Sign Out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
