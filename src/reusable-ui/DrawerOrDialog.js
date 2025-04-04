import * as React from "react";

import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "./ComboBox";
import { ComboBoxCreate } from "./ComboBoxCreate";
import MobxStore from "@/mobx";

export function AddSessionToListDialogDrawer({ sessionId }) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const { lists, addExerciseToList } = MobxStore;
  const myLists = lists.map((list) => ({ label: list.name, value: list.id }));
  const [selectedList, setSelectedList] = React.useState(myLists[0]);

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">+ Save to Playlist</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Save to Playlist</DialogTitle>
            <DialogDescription>
              Add this exercise to one of your custom playlists.
            </DialogDescription>
          </DialogHeader>

          <ProfileForm
            myLists={myLists}
            selectedList={selectedList}
            setSelectedList={setSelectedList}
          />

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => addExerciseToList(selectedList.value, sessionId)}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline">Edit Profile</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Save to Playlist</DrawerTitle>
          <DrawerDescription>
            Add this exercise to one of your custom playlists.
          </DrawerDescription>
        </DrawerHeader>
        <ProfileForm
          myLists={myLists}
          selectedList={selectedList}
          setSelectedList={setSelectedList}
          className="px-4"
        />
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
          <Button
            onClick={() => addExerciseToList(selectedList.value, sessionId)}
          >
            Save
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function ProfileForm({ myLists, selectedList, setSelectedList }) {
  return (
    <div className="mt-auto flex flex-col gap-2 p-4 pt-2">
      <Combobox
        value={selectedList?.value || myLists[0]?.value}
        setValue={(value) => {
          setSelectedList(
            myLists.find((p) => p.value.toLowerCase() === value.toLowerCase())
          );
        }}
        searchLabel="List"
        options={myLists}
      />
    </div>
  );
}
