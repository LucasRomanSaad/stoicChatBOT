import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/layout/ThemeProvider";
import { User } from "@/lib/auth";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  isGuest?: boolean;
  onSignOut: () => void;
}

export function SettingsModal({ open, onOpenChange, user, isGuest = false, onSignOut }: SettingsModalProps) {
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
                <span className="text-sm text-muted-foreground">Account</span>
                <span className="text-sm" data-testid="settings-user-email">
                  {isGuest ? "Guest User" : (user?.email || "Loading...")}
                </span>
              </div>
              {isGuest && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Limited Guest Session</strong>
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    Your conversations are temporary and will be lost when you close the browser. 
                    Create an account to save your conversations permanently.
                  </p>
                </div>
              )}
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
