@MappedSuperclass
open class Person : BaseEntity() {

    @Column(name = "first_name")
    @NotBlank
    var firstName: String? = null

    @Column(name = "last_name")
    @NotBlank
    var lastName: String? = null

}