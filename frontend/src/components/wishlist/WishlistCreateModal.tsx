import React, { useState } from 'react';
import { Search } from 'lucide-react';

import { useWishlistStore } from '@/store/wishlist/wishlistStore';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import KeywordSearchWithMap from './KeywordSearchWithMap';
import AreaSearch from './AreaSearch';
import SpotPreview from './SpotPreview';

const WishlistCreateModal = () => {
  const selectedSpot = useWishlistStore((state) => state.selectedSpot);
  const setSelectedSpot = useWishlistStore((state) => state.setSelectedSpot);
  const [searchType, setSearchType] = useState('area');

  const handleBack = () => {
    setSelectedSpot(null);
  };

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" aria-label="スポットを検索">
            <Search className="mr-2" size={18} />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-7xl h-[90vh] p-0 sm:max-w-[90vw]">
          <ScrollArea className="flex flex-col h-full">
            {/* Header */}
            <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b">
              <DialogTitle className="text-2xl font-bold">行きたいスポットを追加</DialogTitle>
            </DialogHeader>

            {/* Main Content */}
            <div className="flex-1 flex flex-row lg:flex-row overflow-hidden">
              {/* Left Panel - Search */}
              <div className={`w-full lg:w-1/2 border-r flex flex-col ${selectedSpot ? 'hidden lg:flex' : 'flex'}`}>
                <div className="p-4 sm:p-6 border-b">
                  <Tabs value={searchType} onValueChange={setSearchType}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="area">エリアから探す</TabsTrigger>
                      <TabsTrigger value="keyword">キーワードで探す</TabsTrigger>
                    </TabsList>

                    <TabsContent value="area" className="mt-4 space-y-4">
                      <AreaSearch />
                    </TabsContent>

                    <TabsContent value="keyword" className="mt-4 space-y-4">
                      <KeywordSearchWithMap />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              {/* Right Panel - Preview */}
              <div className={`w-full lg:w-1/2 flex flex-col ${!selectedSpot ? 'hidden lg:flex' : 'flex'}`}>
                <SpotPreview onBack={handleBack} />
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WishlistCreateModal;
