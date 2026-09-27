import Foundation
@main struct Check {
 static func main() throws {
  let text="# Real paper\n\nFirst paragraph with a [source](https://example.com).\n\n第二段。\n\n$$ E=mc^2 $$\n\nAfter math."
  let excerpt=PaperWatchExcerpt.make(id:"public-paper",title:"Research",authors:"Authors",markdown:text,selection:"",isPublic:true)!
  precondition(excerpt.blocks == ["First paragraph with a source.","第二段。"])
  precondition(excerpt.truncated)
  precondition(PaperWatchExcerpt.make(id:"private",title:"Private",authors:"",markdown:text,selection:"",isPublic:false)==nil)
  precondition(PaperWatchExcerpt.make(id:"long",title:"Long",authors:"",markdown:String(repeating:"文",count:6000),selection:"",isPublic:true)==nil)
  let selected=PaperWatchExcerpt.make(id:"selected",title:"Selected",authors:"",markdown:text,selection:"Exact selected text.",isPublic:true)!
  precondition(selected.blocks == ["Exact selected text."])
  let data=try JSONEncoder().encode(WatchShelf(schema:1,readings:[excerpt,selected]))
  precondition(WatchShelf.decode(data)?.readings.count==2)
  let duplicates=try JSONEncoder().encode(WatchShelf(schema:1,readings:[excerpt,excerpt]))
  precondition(WatchShelf.decode(duplicates)==nil)
  precondition(WatchShelf.decode(Data("invalid".utf8))==nil)
  print("PASS: public-only policy, exact selection, math boundary, Markdown links, Unicode limits, Codable and duplicate rejection")
 }
}
